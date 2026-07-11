"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, MapPin, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function RockDetail() {
  const { id } = useParams();
  const [rock, setRock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  useEffect(() => {
    const fetchRock = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) throw new Error("No config");
        const docRef = doc(db, "rocks", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRock({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Simulation fallback
          setRock({
            id: "simulated",
            photoUrl: "/placeholder-rock.jpg",
            notes: "A shiny dark rock I found on a hike. Might be obsidian?",
            rating: 4,
            location: { lat: 45.123, lng: -122.456 }
          });
        }
      } catch (e) {
        console.warn("Firebase failed, loading from local storage");
        const stored = JSON.parse(localStorage.getItem('rocks') || '[]');
        const localRock = stored.find((r: any) => r.id === id);
        if (localRock) {
          setRock(localRock);
        } else {
          setRock({
              id: "simulated",
              photoUrl: "/placeholder.png",
              notes: "A shiny dark rock I found on a hike. Might be obsidian?",
              rating: 4,
              location: { lat: 45.123, lng: -122.456 }
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRock();
  }, [id]);

  const investigateWithAI = async () => {
    if (!rock?.photoUrl) return;
    
    try {
      setAnalyzing(true);
      const res = await fetch("/api/analyze-rock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: rock.photoUrl })
      });
      
      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        alert("AI could not analyze this image.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reach AI service");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '3rem'}}>Loading rock details...</div>;
  if (!rock) return <div style={{textAlign: 'center', padding: '3rem'}}>Rock not found!</div>;

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'var(--foreground)' }}><ArrowLeft size={24} /></Link>
        <h1>Rock Details</h1>
      </header>

      <div className="glass" style={{ padding: '0.5rem', marginBottom: '1.5rem' }}>
        <img 
          src={rock.photoUrl} 
          alt="Rock photo" 
          style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover', borderRadius: '12px' }}
        />
      </div>

      <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <Star fill="currentColor" size={18} /> {rock.rating} / 5 Rating
            </div>
            {rock.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <MapPin size={14} /> 
                {rock.location.lat.toFixed(4)}, {rock.location.lng.toFixed(4)}
              </div>
            )}
          </div>
        </div>
        
        {rock.notes && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--foreground)' }}>{rock.notes}</p>
          </div>
        )}
      </div>

      <div className="glass" style={{ padding: '1.5rem', marginBottom: '3rem', border: '1px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Sparkles color="var(--accent)" />
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>AI Geologist</h2>
        </div>
        
        {!aiAnalysis ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ marginBottom: '1rem' }}>Want to know what kind of rock or mineral this is? Have the AI investigate!</p>
            <button className="btn-primary" onClick={investigateWithAI} disabled={analyzing} style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)' }}>
              {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {analyzing ? "Investigating..." : "Investigate Photo"}
            </button>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: aiAnalysis }} style={{ lineHeight: '1.6', fontSize: '0.95rem' }} />
        )}
      </div>
    </>
  );
}
