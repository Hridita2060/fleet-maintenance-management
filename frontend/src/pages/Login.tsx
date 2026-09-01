import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      const response = await api.post('/auth/login', data);
      login(response.data);
      navigate('/');
    } catch (error) {
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg border border-slate-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">FleetSync</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <Input
                type="email"
                {...register('email')}
                className="mt-1"
                placeholder="manager@example.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input
                type="password"
                {...register('password')}
                className="mt-1"
              />
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
};
