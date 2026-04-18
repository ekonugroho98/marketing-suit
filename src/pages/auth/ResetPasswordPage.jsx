import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import AuthLayout from "../../components/layout/AuthLayout";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) return setError("Password minimal 6 karakter");
    if (password !== confirm) return setError("Password tidak cocok");
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <AuthLayout title="Buat Password Baru">
        <div className="card text-center">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-xl font-semibold mb-2">
            Password berhasil diubah
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Kamu bisa login dengan password baru sekarang.
          </p>
          <Button onClick={() => navigate("/login")}>Ke Halaman Login</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Buat Password Baru">
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Password Baru</h2>
        {error && (
          <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Password Baru"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 karakter"
            required
          />
          <Input
            label="Konfirmasi Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ulangi password"
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            Simpan Password
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
