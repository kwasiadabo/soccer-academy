import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AcademyLogo } from '@/design-system/academy-logo';
import { useAuth } from '@/app/auth-context';
import { homePathForRoles } from '@/app/role-routes';
import { ApiError } from '@/lib/api-client';

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
	const [serverError, setServerError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

	const onSubmit = async (values: LoginFormValues) => {
		setServerError(null);
		try {
			const user = await login(values.email, values.password);
			const destination = from ? `${from.pathname}${from.search}${from.hash}` : homePathForRoles(user.roles);
			navigate(destination, { replace: true });
		} catch (err) {
			setServerError(
				err instanceof ApiError
					? err.message
					: 'Unable to log in. Please try again.',
			);
		}
	};

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: 'easeOut' }}
				className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-lg md:grid-cols-2"
			>
				{/* Brand panel */}
				<div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground md:flex">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 overflow-hidden"
					>
						<div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-primary/10" />
						<div className="absolute top-24 -left-16 h-40 w-40 rotate-12 rounded-3xl bg-white/5" />
						<div className="absolute -bottom-20 right-8 h-64 w-64 rounded-full bg-primary/10" />
						<div className="absolute bottom-10 left-10 h-16 w-16 rotate-45 rounded-xl border border-white/10" />
					</div>

					<div className="relative flex items-center gap-2.5">
						<AcademyLogo className="size-12" chip />
						<span className="text-sm font-bold tracking-wide">
							Kapikids Soccer Academy
						</span>
					</div>

					<div className="relative space-y-3">
						<p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
							Player Development Platform
						</p>
						<h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight">
							Welcome back
							<br />.
						</h1>
						<p className="max-w-xs text-sm text-sidebar-foreground/70">
							Sign in to manage rosters, training groups, academy operations and
							view player development from one place.
						</p>
					</div>
				</div>

				{/* Form panel */}
				<div className="flex flex-col justify-center p-8 sm:p-10">
					<div className="mb-6 space-y-1">
						<h2 className="text-xl font-semibold text-foreground">Sign in</h2>
						<p className="text-sm text-muted-foreground">
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
									className="text-xs font-medium text-accent-foreground hover:underline"
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

						{serverError ? (
							<p
								role="alert"
								aria-live="polite"
								className="text-sm text-destructive"
							>
								{serverError}
							</p>
						) : null}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? 'Signing in…' : 'Sign in'}
						</Button>
					</form>
				</div>
			</motion.div>
		</div>
	);
}
