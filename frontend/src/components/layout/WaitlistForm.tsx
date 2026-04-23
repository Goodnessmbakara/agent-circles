import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeGR1AyXtzvzN_mgIyFZlh2raOXCz4xyO9WZyNKs48VxoqG9Q/formResponse";
      const formData = new FormData();
      formData.append("entry.1455515576", email);

      // We use no-cors because Google Forms doesn't allow cross-origin requests, 
      // but the data will still be submitted successfully.
      await fetch(GOOGLE_FORM_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Waitlist submission failed", error);
      // Fallback: open in new tab if fetch fails completely
      window.open(`https://docs.google.com/forms/d/e/1FAIpQLSeGR1AyXtzvzN_mgIyFZlh2raOXCz4xyO9WZyNKs48VxoqG9Q/viewform?usp=pp_url&entry.1455515576=${email}`, "_blank");
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-1">You're on the list!</h3>
        <p className="text-zinc-400 text-sm">We'll notify you when we launch new circles.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all backdrop-blur-md"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary whitespace-nowrap min-w-[140px]"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Join Waitlist"
          )}
        </button>
      </div>
      <p className="text-[10px] text-zinc-500 mt-3 uppercase tracking-[0.15em] font-medium">
        Exclusive early access for the first 500 members
      </p>
    </form>
  );
}
