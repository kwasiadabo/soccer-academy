import "@fontsource/anton";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SamsMark } from '@/design-system/sams-mark';
import { useAuth } from '@/app/auth-context';
import { homePathForRoles } from '@/app/role-routes';
import { ApiError } from '@/lib/api-client';
import { setAcademySlugOverride } from '@/lib/tenant';

const loginSchema = z.object({
	email: z.string().email('Enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: Location } | null)?.from;
	const [showPassword, setShowPassword] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	// Landed here right after a self-serve signup on the root SAMS domain (see
	// sams-signup-page.tsx) — there's no real subdomain to have arrived on yet
	// in local dev, so this stands in for one until the URL param is consumed.
	useEffect(() => {
		const academy = searchParams.get('academy');
		if (!academy) return;
		setAcademySlugOverride(academy);
		toast.success('Your academy is ready — sign in with the email and password you just chose.');
		searchParams.delete('academy');
		setSearchParams(searchParams, { replace: true });
		// Only ever run once, for the param present on the initial navigation.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

	const onSubmit = async (values: LoginFormValues) => {
		try {
			const user = await login(values.email, values.password);
			const destination = from ? `${from.pathname}${from.search}${from.hash}` : homePathForRoles(user.roles);
			navigate(destination, { replace: true });
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Unable to log in. Please try again.');
		}
	};

	return (
		<div className="dark flex min-h-dvh items-center justify-center bg-[#0B0F0A] p-4">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: 'easeOut' }}
				className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0E1310] shadow-2xl md:grid-cols-2"
			>
				{/* Brand panel */}
				<div className="relative hidden flex-col justify-between overflow-hidden bg-[#0B0F0A] p-10 text-white md:flex">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 overflow-hidden"
					>
						<div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-lime-400/10 blur-2xl" />
						<div className="absolute -bottom-20 right-8 h-64 w-64 rounded-full bg-lime-400/10 blur-2xl" />
						<svg className="absolute top-0 right-0 h-full w-2/3 opacity-[0.05]" viewBox="0 0 400 800" fill="none">
							{Array.from({ length: 6 }).map((_, i) => (
								<path
									key={i}
									d={`M ${420 - i * 55} 0 L ${380 - i * 55} 0 L ${180 - i * 55} 800 L ${220 - i * 55} 800 Z`}
									fill="white"
								/>
							))}
						</svg>
					</div>

					<div className="relative flex items-center gap-2.5">
						<SamsMark className="size-12" />
						<span className="text-base font-bold tracking-wide">SAMS</span>
					</div>

					<div className="relative space-y-3">
						<p className="text-xs font-bold tracking-[0.2em] text-lime-400 uppercase">
							Player Development Platform
						</p>
						<h1
							className="text-4xl leading-[0.95] tracking-tight"
							style={{ fontFamily: 'Anton, sans-serif' }}
						>
							WELCOME
							<br />
							<span className="text-lime-400">BACK.</span>
						</h1>
						<p className="max-w-xs text-sm text-white/60">
							Sign in to manage rosters, training groups, academy operations and
							view player development from one place.
						</p>
					</div>
				</div>

				{/* Form panel */}
				<div className="flex flex-col justify-center bg-[#0E1310] p-8 text-white sm:p-10">
					<div className="mb-6 space-y-1">
						<h2 className="text-xl font-semibold text-white">Sign in</h2>
						<p className="text-sm text-white/60">
							Enter your credentials to access your account
						</p>
					</div>

					<form
						className="space-y-4"
						onSubmit={handleSubmit(onSubmit)}
						noValidate
					>
						<div className="space-y-1.5">
							<Label htmlFor="email">Email</Label>
							<div className="relative">
								<Mail
									aria-hidden
									className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="email"
									type="email"
									autoComplete="email"
									aria-invalid={!!errors.email}
									className="pl-9"
									{...register('email')}
								/>
							</div>
							{errors.email ? (
								<p className="text-xs text-destructive">
									{errors.email.message}
								</p>
							) : null}
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Link
									to="/forgot-password"
									className="text-xs font-medium text-lime-400 hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<div className="relative">
								<Lock
									aria-hidden
									className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									autoComplete="current-password"
									aria-invalid={!!errors.password}
									className="pl-9 pr-9"
									{...register('password')}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									aria-pressed={showPassword}
									className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									{showPassword ? (
										<EyeOff className="size-4" aria-hidden />
									) : (
										<Eye className="size-4" aria-hidden />
									)}
								</button>
							</div>
							{errors.password ? (
								<p className="text-xs text-destructive">
									{errors.password.message}
								</p>
							) : null}
						</div>

						<Button
							type="submit"
							className="w-full bg-lime-400 text-[#0B0F0A] hover:bg-lime-300"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Signing in…' : 'Sign in'}
						</Button>
					</form>
				</div>
			</motion.div>
		</div>
	);
}
