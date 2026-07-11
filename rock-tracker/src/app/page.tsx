"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, MapPin, Star } from "lucide-react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [rocks, setRocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) throw new Error("No config");
      const q = query(collection(db, "rocks"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const rocksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRocks(rocksData);
        setLoading(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase not fully configured yet. Loading from local storage.");
      const stored = localStorage.getItem('rocks');
      if (stored) {
        setRocks(JSON.parse(stored));
      }
      setLoading(false);
    }
  }, []);

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Rocks</h1>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--primary)' }}>Loading catalog...</div>
      ) : rocks.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Camera size={32} color="var(--primary)" />
          </div>
          <h2>No rocks yet!</h2>
          <p style={{ marginBottom: '1.5rem' }}>Your collection is empty. Time to go rock hounding!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '6rem' }}>
          {rocks.map((rock) => (
            <Link href={`/rock/${rock.id}`} key={rock.id} style={{ textDecoration: 'none' }}>
              <div className="glass" style={{ overflow: 'hidden', height: '100%', transition: 'transform 0.2s' }}>
                <img 
                  src={rock.photoUrl || '/placeholder.png'} 
                  alt={rock.notes || 'Rock'} 
                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                />
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <Star size={12} fill="currentColor" /> {rock.rating}/5
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rock.notes || "No notes"}
                  </p>
                  {rock.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      <MapPin size={10} /> Has Location
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <Link href="/rock/new" className="btn-primary" style={{ pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)' }}>
          <Camera size={20} />
          Catalog New Rock
        </Link>
      </div>
    </>
  );
}
