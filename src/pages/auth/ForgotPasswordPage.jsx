import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import AuthLayout from "../../components/layout/AuthLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <AuthLayout title="Reset Password">
      <div className="card">
        {sent ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">📧</p>
            <h2 className="text-xl font-semibold mb-2">Cek email kamu</h2>
            <p className="text-gray-500 text-sm mb-4">
              Link reset password sudah dikirim ke <strong>{email}</strong>.
              Klik link di email untuk membuat password baru.
            </p>
            <Link
              to="/login"
              className="text-primary-600 font-medium hover:underline text-sm"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Lupa Password?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Masukkan email akun kamu dan kami akan kirim link reset password.
            </p>

            {error && (
              <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Kirim Link Reset
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              <Link
                to="/login"
                className="text-primary-600 font-medium hover:underline"
              >
                Kembali ke Login
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
