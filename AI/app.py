import os
import io
import base64

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from PIL import Image
from flask import Flask, request, jsonify, render_template
from torchvision import transforms, models

app = Flask(__name__)

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR  = os.path.join(BASE_DIR, "models")
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

LC25000_CLASSES = ["Colon Adenocarcinoma", "Colon Benign", "Lung Adenocarcinoma",
                   "Lung Benign", "Lung Squamous Cell Carcinoma"]

APTOS_CLASSES   = ["No DR (Grade 0)", "Mild DR (Grade 1)", "Moderate DR (Grade 2)",
                   "Severe DR (Grade 3)", "Proliferative DR (Grade 4)"]

# ─────────────────────────────────────────────
#  MODEL ARCHITECTURES (Exact Clones of Training)
# ─────────────────────────────────────────────
class APTOSModel(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        # weights=None prevents downloading ImageNet weights on server startup
        effnet = models.efficientnet_b4(weights=None)
        
        self.features = effnet.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        in_features = effnet.classifier[1].in_features
        
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


class LC25000Model(nn.Module):
    def __init__(self, num_classes=5, dropout=0.4):
        super().__init__()
        # weights=None prevents downloading ImageNet weights on server startup
        backbone    = models.efficientnet_b2(weights=None)
        in_features = backbone.classifier[1].in_features
        self.features   = backbone.features
        self.avgpool    = backbone.avgpool
        
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout / 2),
            nn.Linear(512, num_classes),
        )
        
    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)


# ─────────────────────────────────────────────
#  MODEL LOADING LOGIC
# ─────────────────────────────────────────────
def load_weights(model: nn.Module, path: str) -> nn.Module:
    checkpoint = torch.load(path, map_location=DEVICE)

    # Handle various save formats
    if isinstance(checkpoint, dict):
        if "model" in checkpoint:
            state = checkpoint["model"]
        elif "model_state_dict" in checkpoint:
            state = checkpoint["model_state_dict"]
        elif "state_dict" in checkpoint:
            state = checkpoint["state_dict"]
        else:
            state = checkpoint 
    else:
        state = checkpoint

    model.load_state_dict(state)
    model.to(DEVICE)
    model.eval()
    return model


# Lazy-load dictionary
_models: dict = {}

def get_model(name: str) -> nn.Module:
    if name not in _models:
        if name == "lc25000":
            path = os.path.join(MODEL_DIR, "LC25000_best_model.pth")
            model_skeleton = LC25000Model(num_classes=len(LC25000_CLASSES))
            _models[name] = load_weights(model_skeleton, path)
            
        elif name == "aptos":
            path = os.path.join(MODEL_DIR, "APTOS_best_model.pth")
            model_skeleton = APTOSModel(num_classes=len(APTOS_CLASSES))
            _models[name] = load_weights(model_skeleton, path)
            
        else:
            raise ValueError(f"Unknown model: {name}")
            
    return _models[name]


# ─────────────────────────────────────────────
#  PREPROCESSING 
# ─────────────────────────────────────────────
IMG_SIZE = 224
MEAN     = [0.485, 0.456, 0.406]
STD      = [0.229, 0.224, 0.225]

# Exact APTOS Validation Transform
aptos_val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])

# Exact LC25000 Validation Transform
lc25000_val_tf = transforms.Compose([
    transforms.Resize(int(IMG_SIZE * 1.14)),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])

TRANSFORMS = {
    "aptos"  : aptos_val_tf,
    "lc25000": lc25000_val_tf,
}

def preprocess(image_bytes: bytes, model_name: str) -> torch.Tensor:
    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tf     = TRANSFORMS[model_name]
    tensor = tf(img).unsqueeze(0)   # (1, C, H, W)
    return tensor.to(DEVICE)


def generate_gradcam(model: nn.Module, tensor: torch.Tensor, image_bytes: bytes, target_index: int) -> str:
    # Use pytorch-grad-cam utilities to produce the same visualization
    # Denormalize tensor to [0,1] RGB image expected by show_cam_on_image
    np_tensor = tensor[0].cpu().detach().permute(1, 2, 0).numpy()
    # inverse normalization: x = x*std + mean
    mean = np.array(MEAN).reshape(1, 1, 3)
    std = np.array(STD).reshape(1, 1, 3)
    rgb_img = (np_tensor * std) + mean
    rgb_img = np.clip(rgb_img, 0, 1)

    # Create GradCAM object and compute grayscale CAM
    target_layers = [model.features[-1]] if hasattr(model, 'features') else [model]
    cam = GradCAM(model=model, target_layers=target_layers)
    targets = [ClassifierOutputTarget(target_index)]
    grayscale_cam = cam(input_tensor=tensor, targets=targets)[0, :]

    # show_cam_on_image expects RGB image in range [0,1]
    cam_image = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

    # Convert to PNG bytes
    overlay_pil = Image.fromarray(cam_image)
    buffered = io.BytesIO()
    overlay_pil.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

    buffered = io.BytesIO()
    overlay.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    if "model" not in request.form:
        return jsonify({"error": "No model selected"}), 400

    model_name = request.form["model"].lower()
    image_bytes = request.files["image"].read()

    try:
        model  = get_model(model_name)
        tensor = preprocess(image_bytes, model_name)

        logits = model(tensor)                      # (1, num_classes)
        probs  = torch.softmax(logits, dim=1)[0]    # (num_classes,)
        pred   = torch.argmax(probs).item()
        conf   = probs[pred].item()

        labels = LC25000_CLASSES if model_name == "lc25000" else APTOS_CLASSES

        # Return all class probabilities for a UI bar chart
        all_probs = {labels[i]: round(probs[i].item() * 100, 2)
                     for i in range(len(labels))}

        gradcam_base64 = generate_gradcam(model, tensor, image_bytes, pred)

        return jsonify({
            "model"                 : model_name,
            "prediction"            : labels[pred],
            "confidence"            : round(conf * 100, 2),
            "all_probs"             : all_probs,
            "gradcam_image_base64"  : gradcam_base64,
        })

    except FileNotFoundError as e:
        return jsonify({"error": f"Model file not found: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"Running on device: {DEVICE}")
    app.run(debug=True, port=5000)