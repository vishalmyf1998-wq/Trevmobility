"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Client component mein hamesha ANON key use hoti hai
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ye logged-in user ka password update kar dega
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (error) {
      alert("Error setting password: " + error.message);
    } else {
      alert("Password set successfully!");
      // Password set hone ke baad user ko dashboard par bhej dein
      router.push('/dashboard'); 
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Set Your Password</h2>
      <form onSubmit={handleUpdatePassword}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          required
          className="w-full p-2 border rounded mb-4"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {loading ? 'Saving...' : 'Save Password'}
        </button>
      </form>
    </div>
  );
}
