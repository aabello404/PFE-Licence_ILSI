import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mockUsers } from '../data/mockUsers';
import { useAuthStore } from '../store/useAuthStore';
import { 
  HeartbeatIcon, UserIcon, CalendarIcon, StethoscopeIcon, 
  ChevronDownIcon, PhoneIcon, MailIcon, MapPinIcon, StarIcon
} from '../components/Icons';
import styles from './HomePage.module.css';

const HomePage = () => {
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const statsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const { openAuthModal } = useAuthStore();
  const [lang, setLang] = useState<'en' | 'fr'>('en');

  const t = {
    en: {
      heroTitle: "Your Health,\nOur Priority",
      heroSub: "Experience world-class medical care with MedVision. We blend advanced technology with compassionate care.",
      bookBtn: "Book Appointment",
      medBotBtn: "Try MedBot AI",
      stats: ["Patients", "Doctors", "Support", "Years Experience"],
      servicesTitle: "Our Services",
      servicesSub: "Comprehensive healthcare solutions tailored to your needs",
      teamTitle: "Meet Our Team",
      teamSub: "Dedicated professionals committed to your wellbeing",
      howTitle: "How It Works",
      howSub: "Three simple steps to better health",
      register: "Register",
      consult: "Consult Doctor",
      testiTitle: "Patient Testimonials",
      quickLinks: "Quick Links",
      contact: "Contact Us",
      language: "Language",
    },
    fr: {
      heroTitle: "Votre Santé,\nNotre Priorité",
      heroSub: "Découvrez des soins médicaux de classe mondiale avec MedVision. Nous allions technologie de pointe et soins compatissants.",
      bookBtn: "Prendre Rendez-vous",
      medBotBtn: "Essayer MedBot AI",
      stats: ["Patients", "Médecins", "Support", "Années d'Expérience"],
      servicesTitle: "Nos Services",
      servicesSub: "Des solutions de santé complètes adaptées à vos besoins",
      teamTitle: "Notre Équipe",
      teamSub: "Des professionnels dévoués à votre bien-être",
      howTitle: "Comment ça Marche",
      howSub: "Trois étapes simples pour une meilleure santé",
      register: "S'inscrire",
      consult: "Consulter",
      testiTitle: "Témoignages",
      quickLinks: "Liens Rapides",
      contact: "Nous Contacter",
      language: "Langue",
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Stats counter animation
            if (entry.target.classList.contains(styles.statsBar)) {
              statsRef.current.forEach(stat => {
                if (!stat) return;
                const target = parseInt(stat.getAttribute('data-target') || '0', 10);
                let current = 0;
                const increment = target / 50; // 50 steps
                const timer = setInterval(() => {
                  current += increment;
                  if (current >= target) {
                    stat.innerText = target.toLocaleString() + (stat.getAttribute('data-suffix') || '');
                    clearInterval(timer);
                  } else {
                    stat.innerText = Math.ceil(current).toLocaleString() + (stat.getAttribute('data-suffix') || '');
                  }
                }, 30);
              });
            }
            
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const doctors = mockUsers.filter(u => u.role === 'DOCTOR');

  return (
    <div className={styles.homeContainer}>
      {/* 1. Hero Section */}
      <section 
        className={`${styles.hero} ${styles.animateSection}`} 
        ref={el => { sectionsRef.current[0] = el; }}
      >
        <div className={styles.heroContent}>
          <div className={styles.heroLeft} style={{ '--i': 1 } as React.CSSProperties}>
            <h1 className={styles.heroTitle} style={{ whiteSpace: 'pre-line' }}>{t[lang].heroTitle}</h1>
            <p className={styles.heroSubtitle}>
              {t[lang].heroSub}
            </p>
            <div className={styles.heroBtns}>
              <Link to="/appointments" className={styles.primaryBtn}>{t[lang].bookBtn}</Link>
              <Link to="/chat" className={styles.secondaryBtn}>{t[lang].medBotBtn}</Link>
            </div>
          </div>
        </div>
        <div className={styles.scrollIndicator}>
          <ChevronDownIcon size={32} className={styles.bounce} />
        </div>
      </section>

      {/* 2. Stats Bar */}
      <section 
        className={`${styles.statsBar} ${styles.animateSection}`}
        ref={el => { sectionsRef.current[1] = el; }}
      >
        <div className={styles.statItem} style={{ '--i': 1 } as React.CSSProperties}>
          <UserIcon size={32} color="var(--accent)" />
          <span ref={el => { statsRef.current[0] = el; }} data-target="12000" data-suffix="+">0</span>
          <p>{t[lang].stats[0]}</p>
        </div>
        <div className={styles.statItem} style={{ '--i': 2 } as React.CSSProperties}>
          <StethoscopeIcon size={32} color="var(--accent)" />
          <span ref={el => { statsRef.current[1] = el; }} data-target="85">0</span>
          <p>{t[lang].stats[1]}</p>
        </div>
        <div className={styles.statItem} style={{ '--i': 3 } as React.CSSProperties}>
          <HeartbeatIcon size={32} color="var(--accent)" />
          <span ref={el => { statsRef.current[2] = el; }} data-target="24" data-suffix="/7">0</span>
          <p>{t[lang].stats[2]}</p>
        </div>
        <div className={styles.statItem} style={{ '--i': 4 } as React.CSSProperties}>
          <CalendarIcon size={32} color="var(--accent)" />
          <span ref={el => { statsRef.current[3] = el; }} data-target="15">0</span>
          <p>{t[lang].stats[3]}</p>
        </div>
      </section>

      {/* 3. Services Section */}
      <section 
        className={`${styles.services} ${styles.animateSection}`}
        ref={el => { sectionsRef.current[2] = el; }}
      >
        <div className={styles.sectionHeader}>
          <h2>{t[lang].servicesTitle}</h2>
          <p>{t[lang].servicesSub}</p>
        </div>
        <div className={styles.servicesGrid}>
          <div className={styles.serviceCard} style={{ '--i': 1 } as React.CSSProperties}>
            <img src="/src/assets/service-icons/general.svg" alt="General" />
            <h3>General Medicine</h3>
            <p>Comprehensive physical exams and preventive care for patients of all ages.</p>
            <a href="#" className={styles.learnMore}>Learn More</a>
          </div>
          <div className={styles.serviceCard} style={{ '--i': 2 } as React.CSSProperties}>
            <img src="/src/assets/service-icons/cardiology.svg" alt="Cardiology" />
            <h3>Cardiology</h3>
            <p>Advanced cardiovascular diagnostics and personalized treatment plans.</p>
            <a href="#" className={styles.learnMore}>Learn More</a>
          </div>
          <div className={styles.serviceCard} style={{ '--i': 3 } as React.CSSProperties}>
            <img src="/src/assets/service-icons/neurology.svg" alt="Neurology" />
            <h3>Neurology</h3>
            <p>Expert care for disorders of the nervous system and brain health.</p>
            <a href="#" className={styles.learnMore}>Learn More</a>
          </div>
        </div>
      </section>

      {/* 4. Doctors Section */}
      <section 
        className={`${styles.doctors} ${styles.animateSection}`}
        ref={el => { sectionsRef.current[3] = el; }}
      >
        <div className={styles.sectionHeader}>
          <h2>{t[lang].teamTitle}</h2>
          <p>{t[lang].teamSub}</p>
        </div>
        <div className={styles.doctorsGrid}>
          {doctors.map((doc, idx) => (
            <div key={doc.id} className={styles.doctorCard} style={{ '--i': idx + 1 } as React.CSSProperties}>
              <img src={`/src/assets/doctor-${(idx % 2) + 1}.svg`} alt={`${doc.firstName} ${doc.lastName}`} className={styles.docImg} />
              <div className={styles.docInfo}>
                <h3>{`Dr. ${doc.lastName}`}</h3>
                <span className={styles.specialtyBadge}>{doc.specialty}</span>
                <Link to="/appointments" className={styles.bookBtn}>{t[lang].bookBtn}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. How It Works */}
      <section 
        className={`${styles.howItWorks} ${styles.animateSection}`}
        ref={el => { sectionsRef.current[4] = el; }}
      >
        <div className={styles.sectionHeader}>
          <h2>{t[lang].howTitle}</h2>
          <p>{t[lang].howSub}</p>
        </div>
        <div className={styles.stepsFlow}>
          <div className={styles.step} style={{ '--i': 1 } as React.CSSProperties}>
            <div className={styles.stepIconWrapper}>
              <UserIcon size={32} />
              <div className={styles.stepNum}>1</div>
            </div>
            <h3>{t[lang].register}</h3>
            <p>Create your secure patient account in minutes.</p>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={styles.step} style={{ '--i': 2 } as React.CSSProperties}>
            <div className={styles.stepIconWrapper}>
              <CalendarIcon size={32} />
              <div className={styles.stepNum}>2</div>
            </div>
            <h3>{t[lang].bookBtn}</h3>
            <p>Choose your doctor and find a time that works for you.</p>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={styles.step} style={{ '--i': 3 } as React.CSSProperties}>
            <div className={styles.stepIconWrapper}>
              <StethoscopeIcon size={32} />
              <div className={styles.stepNum}>3</div>
            </div>
            <h3>{t[lang].consult}</h3>
            <p>Visit the clinic or consult online for expert care.</p>
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section 
        className={`${styles.testimonials} ${styles.animateSection}`}
        ref={el => { sectionsRef.current[5] = el; }}
      >
        <div className={styles.sectionHeader}>
          <h2>{t[lang].testiTitle}</h2>
          <p>What our patients say about us</p>
        </div>
        <div className={styles.testiGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.testiCard} style={{ '--i': i } as React.CSSProperties}>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} size={16} color="var(--warning)" fill="var(--warning)" />)}
              </div>
              <p className={styles.quote}>
                "The doctors at MedVision are incredibly professional and caring. The online booking system made my life so much easier!"
              </p>
              <div className={styles.testiAuthor}>
                <div className={styles.authorAvatar}><UserIcon size={20} /></div>
                <div>
                  <h4>Happy Patient</h4>
                  <span>Verified Visit</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.brandTitle}>
              <HeartbeatIcon size={24} color="var(--accent)" />
              <h2>MedVision</h2>
            </div>
            <p>Pioneering the future of healthcare through innovation and compassion.</p>
          </div>
          
          <div className={styles.footerLinks}>
            <h3>{t[lang].quickLinks}</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/appointments">Appointments</Link></li>
              <li><button onClick={() => openAuthModal('signin')} style={{background:'none', border:'none', padding:0, color:'var(--text-secondary)', cursor:'pointer'}}>Connect</button></li>
              <li><Link to="/chat">MedBot</Link></li>
            </ul>
          </div>

          <div className={styles.footerContact}>
            <h3>{t[lang].contact}</h3>
            <ul>
              <li><PhoneIcon size={18} /> +212(0) 618709003</li>
              <li><MailIcon size={18} /> info@medvision.ma</li>
              <li><MapPinIcon size={18} /> FST Mohammedia</li>
            </ul>
            <div className={styles.miniMap} style={{ height: '180px' }}>
              <MapContainer center={[33.7066, -7.3614]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <Marker position={[33.7066, -7.3614]}>
                  <Popup>FST Mohammedia</Popup>
                </Marker>
              </MapContainer>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{t[lang].language}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setLang('en')} 
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: lang === 'en' ? '2px solid var(--accent)' : '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >EN</button>
                <button 
                  onClick={() => setLang('fr')} 
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: lang === 'fr' ? '2px solid var(--accent)' : '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >FR</button>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2026 MedVision. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
