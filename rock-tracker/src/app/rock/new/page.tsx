"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, MapPin, Loader2, ArrowLeft, CheckCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useSession, signIn } from "next-auth/react";

export default function NewRockPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(3);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Google Photos state
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    if (session && (session as any).accessToken && photos.length === 0) {
      fetchPhotos();
    }
  }, [session]);

  const fetchPhotos = async () => {
    try {
      setLoadingPhotos(true);
      const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=12', {
        headers: {
          Authorization: `Bearer ${(session as any).accessToken}`
        }
      });
      const data = await res.json();
      if (data.mediaItems) {
        // filter out non-images just in case
        setPhotos(data.mediaItems.filter((m: any) => m.mimeType?.startsWith('image/')));
      } else if (data.error) {
        console.error("Google API Error:", data.error);
        alert("Google API Error: " + (data.error.message || "Unknown error"));
      } else {
        alert("No photos found in your Google Photos library!");
      }
    } catch (err: any) {
      console.error("Failed to fetch photos", err);
      alert("Network Error: " + err.message);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleSelectPhoto = async (mediaItem: any) => {
    try {
      // The baseUrl expires, so we fetch a compressed 800x800 thumbnail to save permanently!
      const compressedUrl = `${mediaItem.baseUrl}=w800-h800-c`;
      
      // Fetch the image via our server proxy to completely bypass browser CORS blocks!
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(compressedUrl)}`);
      
      if (!res.ok) throw new Error("Failed to proxy image");
      const blob = await res.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      alert("Failed to process Google Photo");
    }
  };

  const getLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get location. Make sure permissions are granted.");
          setLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!photoDataUrl) return alert("Please snap a photo of the rock first!");
    
    try {
      setSaving(true);
      
      let finalPhotoUrl = photoDataUrl;
      try {
        const imageRef = ref(storage, `rocks/${Date.now()}.jpg`);
        await uploadString(imageRef, photoDataUrl, 'data_url');
        finalPhotoUrl = await getDownloadURL(imageRef);

        const docRef = await addDoc(collection(db, "rocks"), {
          photoUrl: finalPhotoUrl,
          notes,
          rating,
          location,
          createdAt: serverTimestamp()
        });
        router.push(`/rock/${docRef.id}`);
        return;
      } catch (fbErr) {
        console.warn("Firebase failed, falling back to local storage", fbErr);
        
        // LocalStorage fallback
        const newRock = {
          id: Date.now().toString(),
          photoUrl: photoDataUrl,
          notes,
          rating,
          location,
          createdAt: new Date().toISOString()
        };
        
        const existing = JSON.parse(localStorage.getItem('rocks') || '[]');
        localStorage.setItem('rocks', JSON.stringify([newRock, ...existing]));
        
        setSaving(false);
        setSaved(true);
        setTimeout(() => {
          router.push(`/rock/${newRock.id}`);
        }, 1500);
      }
      
    } catch (error) {
      console.error("Error saving rock:", error);
      alert("Failed to save rock");
      setSaving(false);
    }
  };

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--foreground)' }}><ArrowLeft size={24} /></Link>
        <h1>New Discovery</h1>
      </header>

      <div className="glass" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        {!photoDataUrl ? (
          <div>
            {status === "loading" ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{margin: '0 auto'}} /></div>
            ) : status === "authenticated" ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><ImageIcon size={18} /> Google Photos</h3>
                  <button onClick={() => {
                    localStorage.removeItem('photos_error');
                    import("next-auth/react").then(m => m.signOut());
                  }} style={{ fontSize: '0.8rem', background: 'rgba(255,0,0,0.2)', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                    Sign Out & Retry
                  </button>
                </div>
                {loadingPhotos ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{margin: '0 auto'}} /></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {photos.map((photo) => (
                      <div 
                        key={photo.id} 
                        onClick={() => handleSelectPhoto(photo)}
                        style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', height: '100px' }}
                      >
                        <img src={`${photo.baseUrl}=w300-h300-c`} alt="Google Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div 
                onClick={() => signIn("google")}
                style={{ 
                  height: '250px', 
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url("/default-rock.png")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ImageIcon size={48} style={{ marginBottom: '1rem', dropShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
                  <span style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Sign in with Google</span>
                  <span style={{ fontSize: '0.9rem', color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Connect to pick your own photos</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={photoDataUrl} alt="Preview" className="image-preview" />
            <button 
              onClick={() => setPhotoDataUrl(null)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px' }}
            >
              Change Photo
            </button>
          </div>
        )}
      </div>

      <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2>Rate this Rock</h2>
        <p style={{marginBottom: '1rem'}}>1 = Pebble, 5 = Boulder!</p>
        <div className="rating-container">
          {[1, 2, 3, 4, 5].map((num) => (
            <button 
              key={num}
              className={`rating-btn ${rating === num ? 'active' : ''}`}
              onClick={() => setRating(num)}
            >
              {num}
            </button>
          ))}
        </div>

        <h2 style={{marginTop: '1.5rem'}}>Location</h2>
        {location ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px' }}>
            <MapPin size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
            </span>
          </div>
        ) : (
          <button className="btn-secondary" onClick={getLocation} disabled={locating} style={{ marginBottom: '1rem' }}>
            {locating ? <Loader2 className="animate-spin" style={{animation: 'spin 1s linear infinite'}} /> : <MapPin />}
            Pinpoint Location
          </button>
        )}

        <h2>Notes</h2>
        <textarea 
          className="input" 
          placeholder="Where did you find it? What does it look like?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        ></textarea>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving || saved || !photoDataUrl} style={{ marginBottom: '2rem', background: saved ? 'var(--primary)' : undefined }}>
        {saving ? <Loader2 className="animate-spin" style={{animation: 'spin 1s linear infinite'}} /> : saved ? <CheckCircle /> : <Camera />}
        {saving ? "Saving..." : saved ? "Rock Saved Safely!" : "Save to Catalog"}
      </button>
    </>
  );
}
