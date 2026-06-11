import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Edit, Save, BookOpen, MapPin, Building2, ExternalLink } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

const Profile = () => {
  const { user } = useAuth();
  
  // Mock extended profile data (saving to localStorage since these fields aren't in the backend User schema yet)
  const defaultProfile = {
    university: 'Stanford University',
    department: 'Computer Science',
    researchInterest: 'AI, Medical Imaging, XAI',
    githubLink: 'https://github.com/researcher',
    scholarLink: 'https://scholar.google.com/citations?user=xyz',
    linkedinLink: 'https://linkedin.com/in/researcher'
  };

  const [profileData, setProfileData] = useState(defaultProfile);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(`medrepro_profile_${user?._id}`);
    if (saved) {
      setProfileData(JSON.parse(saved));
    }
  }, [user]);

  const handleEdit = () => {
    setFormData(profileData);
    setEditing(true);
  };

  const handleSave = () => {
    setProfileData(formData);
    localStorage.setItem(`medrepro_profile_${user?._id}`, JSON.stringify(formData));
    setEditing(false);
    toast.success('Profile updated successfully');
  };

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Researcher Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Manage your academic details and portfolio links.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Left Card: Summary */}
        <div className="academic-card" style={{ padding: 32, textAlign: 'center', alignSelf: 'start' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--gradient-primary)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{user?.name?.charAt(0)}</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{user?.email}</p>
          
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {user?.role === 'admin' ? 'System Administrator' : 'AI Researcher'}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Building2 size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 14 }}>{profileData.university}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <MapPin size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 14 }}>{profileData.department}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <BookOpen size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 14 }}>{profileData.researchInterest}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Form/Details */}
        <div className="academic-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Academic Information</h3>
            {!editing ? (
              <button className="btn-secondary" onClick={handleEdit}>
                <Edit size={16} /> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Full Name</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{user?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email Address</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{user?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>University / Institution</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{profileData.university || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Department</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{profileData.department || '—'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Research Interest</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{profileData.researchInterest || '—'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Portfolio Links</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {profileData.githubLink && (
                    <a href={profileData.githubLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
                    <FaGithub size={18} color="var(--text-muted)" /> {profileData.githubLink} <ExternalLink size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </a>
                  )}
                  {profileData.scholarLink && (
                    <a href={profileData.scholarLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      <BookOpen size={18} color="var(--text-muted)" /> {profileData.scholarLink} <ExternalLink size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </a>
                  )}
                  {profileData.linkedinLink && (
                    <a href={profileData.linkedinLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      <FaLinkedin size={18} color="var(--text-muted)" />{profileData.linkedinLink} <ExternalLink size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">University / Institution</label>
                  <input className="input-field" value={formData.university || ''} onChange={e => setFormData({...formData, university: e.target.value})} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input-field" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Research Interest</label>
                <input className="input-field" value={formData.researchInterest || ''} onChange={e => setFormData({...formData, researchInterest: e.target.value})} placeholder="e.g. AI, Medical Imaging, XAI" />
              </div>
              
              <div style={{ marginTop: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Portfolio Links</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="label">GitHub Profile</label>
                    <input className="input-field" value={formData.githubLink || ''} onChange={e => setFormData({...formData, githubLink: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Google Scholar Link</label>
                    <input className="input-field" value={formData.scholarLink || ''} onChange={e => setFormData({...formData, scholarLink: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">LinkedIn Link</label>
                    <input className="input-field" value={formData.linkedinLink || ''} onChange={e => setFormData({...formData, linkedinLink: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
