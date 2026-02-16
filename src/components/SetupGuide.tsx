import { useState } from 'react';
import { FileJson, FolderSync, Settings, Search, PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './SetupGuide.css';

const SetupGuide: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);

    const startScan = async () => {
        setIsScanning(true);
        const tid = toast.loading('Front qovluğu skan edilir...');
        try {
            const res = await fetch('/api/extract-content', { method: 'POST' });
            if (!res.ok) throw new Error('Skan xətası');
            toast.success('Skan tamamlandı! Panel yenilənir...', { id: tid });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            toast.error('Skan uğursuz oldu!', { id: tid });
        } finally {
            setIsScanning(false);
        }
    };

    const steps = [
        {
            id: 1,
            title: 'Sitemap Faylını Yaradın',
            description: 'public/sitemap.json faylına menyu strukturunuzu əlavə edin və ya front-dan gətirin.',
            path: 'public/sitemap.json',
            icon: FileJson,
        },
        {
            id: 2,
            title: 'Front Layihəsini Sinxronlaşdırın',
            description: '/front qovluğundakı React layihəsini skan edərək bütün səhifələri menyuya çıxarın.',
            path: '/front/src/pages',
            icon: FolderSync,
        },
        {
            id: 3,
            title: 'Sistem Ayarlarını Tənzimləyin',
            description: 'Saytın ümumi tənzimləmələrini, loqo və əlaqə məlumatlarını idarə edin.',
            path: 'Sistem Ayarları',
            icon: Settings,
        }
    ];

    return (
        <div className="setup-guide">
            <div className="setup-header">
                <div className="setup-brand">
                    <div className="octo-logo">🏎️</div>
                    <h2>Forsaj Club İdarəetmə</h2>
                </div>
                <h1>Xoş Gəlmisiniz! Paneli Qurmağa Başlayaq</h1>
                <p>Forsaj Club platformanız üçün premium admin paneli artıq hazırdır. Aşağıdakı addımları izləyərək front layihənizi adminlə birləşdirin.</p>
            </div>

            <div className="setup-grid">
                <div className="steps-container">
                    {steps.map((step) => (
                        <div key={step.id} className="step-card">
                            <div className="step-icon">
                                <step.icon size={26} />
                            </div>
                            <div className="step-content">
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                                <span className="step-badge">{step.path}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="setup-sidebar-actions">
                    <div className="action-card primary">
                        <PlusCircle size={32} />
                        <h4>Yeni Səhifə Əlavə Et</h4>
                        <p>Dinamik olaraq yeni admin səhifəsi yaradın.</p>
                    </div>
                    <div className="action-card secondary">
                        <Search size={32} />
                        <h4>Front Skaner</h4>
                        <p>/front qosulub. Skanlamağa hazırdır.</p>
                        <button
                            className={`scan-btn ${isScanning ? 'loading' : ''}`}
                            onClick={startScan}
                            disabled={isScanning}
                        >
                            {isScanning ? <Loader2 className="animate-spin" /> : 'İndi Skan Et'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="setup-footer">
                <div className="info-box">
                    <strong>Məlumat:</strong> /front qovluğu aşkar edildi. Sitemap avtomatik generasiya olunduqda bu ekran Dashboard ilə əvəzlənəcək.
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;
