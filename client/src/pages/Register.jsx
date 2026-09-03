import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import Logo from '../components/Logo.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import useAuth from '../hooks/useAuth.js';
import { fieldErrorsFrom } from '../utils/formErrors.js';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // The only rule the server cannot check — it never receives the second
    // field. Everything else is validated server-side and echoed back per field.
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFieldErrors(fieldErrorsFrom(error));
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Logo size="md" />
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1.5 text-slate-600">Start splitting expenses in a minute.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {formError && (
            <p
              role="alert"
              className="mb-5 rounded-lg bg-negative-50 px-3.5 py-2.5 text-sm text-negative-700"
            >
              {formError}
            </p>
          )}

          <Input
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Alok Kumar"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name}
            required
          />

          <Input
            className="mt-5"
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
          />

          <Input
            className="mt-5"
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            hint="At least 8 characters, with a letter and a number."
            required
          />

          <Input
            className="mt-5"
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
          />

          <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
