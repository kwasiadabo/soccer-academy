import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
	Award,
	Users,
	Sparkles,
	CheckCircle2,
	CalendarClock,
	Heart,
	Mail,
	Phone,
	MessageCircle,
	MapPin,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AcademyLogo } from '@/design-system/academy-logo';
import { JoinUsDialog } from './join-us-dialog';
import { usePlayerOfTheWeekFeed } from './player-of-the-week-api';
import { useGalleryFeed } from '@/features/gallery/gallery-api';
import { formatDate } from '@/lib/date';

const HERO_IMAGES = ['/images/hero-academy.jpg', '/images/hero-academy-2.jpg'];

// Seconds of scroll time per card in the Player of the Week marquee (lower = faster).
const MARQUEE_DURATION_PER_CARD = 20 / 1.5;

function HeroBackground({ images }: { images: string[] }) {
	const [index, setIndex] = useState(0);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		setIndex(0);
	}, [images]);

	useEffect(() => {
		if (reduceMotion || images.length <= 1) return;
		const id = setInterval(
			() => setIndex((i) => (i + 1) % images.length),
			6000,
		);
		return () => clearInterval(id);
	}, [reduceMotion, images]);

	return (
		<div aria-hidden className="absolute inset-0">
			<AnimatePresence>
				<motion.img
					key={images[index]}
					src={images[index]}
					alt=""
					className="absolute inset-0 size-full object-cover"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 1.2, ease: 'easeInOut' }}
				/>
			</AnimatePresence>
		</div>
	);
}

const heroBullets = [
	'licensed coaching staff',
	'Individual, player-first approach',
	'Small groups, max 8 players',
];

const differentiators = [
	{
		icon: Award,
		title: 'Licensed Coaches',
		description:
			'Every session is led by qualified coaches trained to work with young players.',
	},
	{
		icon: Users,
		title: 'Small Group Sizes',
		description:
			'We cap groups at 8 players so every child gets real coaching attention.',
	},
	{
		icon: Heart,
		title: 'Individual Approach',
		description:
			"Training plans adapt to each player's age, confidence, and skill level.",
	},
	{
		icon: CalendarClock,
		title: 'Ages 3 to 13',
		description:
			'Age-appropriate programs that grow with your child, from first touch to match-ready.',
	},
];

const programs = [
	{
		name: 'Small Papas',
		ageRange: 'Ages 3–5',
		description:
			'Fun, low-pressure sessions that build coordination, confidence, and a love of the game.',
		points: [
			'30–40 minute sessions',
			'Games-based learning',
			'Parent-and-child friendly',
		],
	},
	{
		name: 'Junior Papas',
		ageRange: 'Ages 6–9',
		description:
			'Core technical skills — passing, dribbling, and ball control — built through structured play.',
		points: [
			'Small-sided games',
			'Skill progression tracking',
			'Twice-weekly sessions',
		],
	},
	{
		name: 'Middle Papas',
		ageRange: 'Ages 10–13',
		description:
			'Match-focused training for players ready to sharpen tactics, fitness, and competitive edge.',
		points: [
			'Tactical training',
			'Strength & conditioning basics',
			'Optional match play',
		],
	},
	{
		name: 'Big Papas',
		ageRange: 'Ages 13–18',
		description:
			'Match-focused training for players ready to sharpen tactics, fitness, and competitive edge.',
		points: [
			'Tactical training',
			'Strength & conditioning basics',
			'Optional match play',
		],
	},
];

const testimonials = [
	{
		quote:
			'My daughter looks forward to every session. The coaches know exactly how to keep young kids engaged.',
		role: 'Parent of a Little Kickers player',
	},
	{
		quote:
			'The small group sizes make a real difference — our son gets actual feedback, not just drills in a crowd.',
		role: 'Parent of a Junior Academy player',
	},
	{
		quote:
			'Structured, serious training without losing the fun. Exactly what we were looking for.',
		role: 'Parent of an Elite Development player',
	},
];

function SectionHeading({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-80px' }}
			transition={{ duration: 0.3, ease: 'easeOut' }}
			className="mx-auto max-w-2xl text-center"
		>
			<span className="text-xs font-bold uppercase tracking-wider text-accent-foreground">
				{eyebrow}
			</span>
			<h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
				{title}
			</h2>
			{description ? (
				<p className="mt-3 text-sm text-muted-foreground sm:text-base">
					{description}
				</p>
			) : null}
		</motion.div>
	);
}

function PlayerOfTheWeekMarquee() {
	const { data } = usePlayerOfTheWeekFeed();
	const reduceMotion = useReducedMotion();
	const players = data ?? [];

	if (players.length === 0) return null;

	// A handful of players (sometimes just one) would otherwise leave the track far
	// narrower than the screen — a small clump of cards sitting in a sea of empty
	// space rather than a strip that spans edge to edge. Repeat the list enough times
	// to comfortably out-width very wide monitors, then duplicate that whole block once
	// more so the first half exactly matches the second — a seamless loop at any length.
	const CARD_SPAN_PX = 244; // w-56 card (224px) + gap-5 (20px)
	const MIN_UNIT_PX = 3200;
	const repeats = Math.max(1, Math.ceil(MIN_UNIT_PX / (players.length * CARD_SPAN_PX)));
	const unit = Array.from({ length: repeats }, () => players).flat();
	const track = [...unit, ...unit];

	return (
		<section id="player-of-the-week" className="py-16 sm:py-20">
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<SectionHeading
					eyebrow="Player of the week"
					title="Training hard, every Saturday"
					description="One standout player from every team, picked from this week's training ratings."
				/>
			</div>

			<div className="relative left-1/2 mt-10 w-screen -translate-x-1/2 overflow-hidden">
				<motion.div
					// framer-motion won't restart an already-running infinite loop just because
					// `transition.duration` changes on a later render (the animate target itself,
					// x: '-50%', is unchanged) — keying on the duration forces a clean remount so
					// speed changes always take effect immediately, not just on a full page reload.
					key={MARQUEE_DURATION_PER_CARD}
					className="flex w-max gap-5"
					initial={{ x: '0%' }}
					animate={reduceMotion ? undefined : { x: '-50%' }}
					transition={
						reduceMotion
							? undefined
							: { duration: unit.length * MARQUEE_DURATION_PER_CARD, repeat: Infinity, ease: 'linear' }
					}
				>
					{track.map((player, i) => (
						<figure
							key={`${player.id}-${i}`}
							className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
						>
							<img
								src={player.photoUrl}
								alt={`${player.firstName} ${player.lastInitial}.`}
								className="h-56 w-full object-cover"
							/>
							<figcaption className="p-4">
								<p className="text-xs font-bold uppercase tracking-wide text-accent-foreground">
									Player of the week
								</p>
								<p className="mt-1 text-sm font-semibold text-foreground">
									{player.firstName} {player.lastInitial}. · {player.teamName}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Trained hard and earned the top rating this week.
								</p>
							</figcaption>
						</figure>
					))}
				</motion.div>
			</div>
		</section>
	);
}

function GallerySection() {
	const { data } = useGalleryFeed();
	const training = (data ?? []).filter((p) => p.context === 'SATURDAY_TRAINING');
	const matchDay = (data ?? []).filter((p) => p.context === 'MATCH');

	if (training.length === 0 && matchDay.length === 0) return null;

	return (
		<section id="gallery" className="bg-muted/40 py-16 sm:py-20">
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<SectionHeading
					eyebrow="Gallery"
					title="Moments from the pitch"
					description="Fresh photos from Saturday training and match days."
				/>

				<div className="mt-10 space-y-10">
					{training.length > 0 ? (
						<div>
							<h3 className="mb-1 text-sm font-semibold text-foreground">
								Saturday training
							</h3>
							<p className="mb-4 text-sm text-muted-foreground">
								{formatDate(training[0].sessionDate)} · {training[0].details}
							</p>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{training.map((photo) => (
									<div
										key={photo.id}
										className="aspect-square overflow-hidden rounded-xl border border-border bg-card"
									>
										<img src={photo.url} alt="" className="size-full object-cover" />
									</div>
								))}
							</div>
						</div>
					) : null}

					{matchDay.length > 0 ? (
						<div>
							<h3 className="mb-1 text-sm font-semibold text-foreground">
								Match day
							</h3>
							<p className="mb-4 text-sm text-muted-foreground">
								{formatDate(matchDay[0].sessionDate)} · {matchDay[0].details}
							</p>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{matchDay.map((photo) => (
									<div
										key={photo.id}
										className="aspect-square overflow-hidden rounded-xl border border-border bg-card"
									>
										<img src={photo.url} alt="" className="size-full object-cover" />
									</div>
								))}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}

export function LandingPage() {
	const { data: galleryPhotos } = useGalleryFeed();
	const heroImages =
		galleryPhotos && galleryPhotos.length > 0
			? [...galleryPhotos]
					.sort(
						(a, b) =>
							new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
					)
					.slice(0, 6)
					.map((photo) => photo.url)
			: HERO_IMAGES;

	return (
		<div className="min-h-dvh overflow-x-hidden bg-background">
			<header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-2">
						<AcademyLogo className="size-10" />
						<span className="text-sm font-semibold text-foreground">
							Kapikids Soccer Academy
						</span>
					</div>

					<nav
						aria-label="Primary"
						className="hidden items-center gap-6 md:flex"
					>
						<a
							href="#programs"
							className="text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Programs
						</a>
						<a
							href="#why-us"
							className="text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Why us
						</a>
						<a
							href="#gallery"
							className="text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Gallery
						</a>
						<a
							href="#testimonials"
							className="text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Testimonials
						</a>
						<a
							href="#contact"
							className="text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Contact
						</a>
					</nav>

					<Button asChild size="sm">
						<Link to="/login">Sign in</Link>
					</Button>
				</div>
			</header>

			{/* Hero */}
			<section className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
				<HeroBackground images={heroImages} />
				<div
					aria-hidden
					className="absolute inset-0 bg-linear-to-r from-sidebar/70 via-sidebar/45 to-sidebar/15"
				/>
				<div
					aria-hidden
					className="absolute inset-0 bg-linear-to-t from-sidebar/40 via-transparent to-transparent"
				/>

				<div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center md:py-28">
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.35, ease: 'easeOut' }}
					>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
							<Sparkles className="size-3.5 text-primary" aria-hidden />
							Ages 2–18 · All skill levels
						</span>

						<h1 className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
							Shaping future <span className="text-primary">champions</span>
						</h1>

						<p className="mt-4 max-w-md text-sm text-sidebar-foreground/70 sm:text-base">
							Personalized coaching for young players, taught by licensed
							coaches in small, focused groups built around every child's
							development.
						</p>

						<div className="mt-7 flex flex-wrap gap-3">
							<JoinUsDialog trigger={<Button size="lg">Join us</Button>} />
							<Button
								asChild
								size="lg"
								variant="outline"
								className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
							>
								<a href="#programs">See programs</a>
							</Button>
						</div>

						<ul className="mt-8 grid gap-2 sm:grid-cols-2">
							{heroBullets.map((bullet) => (
								<li
									key={bullet}
									className="flex items-center gap-2 text-sm text-sidebar-foreground/90"
								>
									<CheckCircle2
										className="size-4 shrink-0 text-primary"
										aria-hidden
									/>
									{bullet}
								</li>
							))}
						</ul>
					</motion.div>
				</div>
			</section>

			{/* Why us */}
			<section
				id="why-us"
				className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
			>
				<SectionHeading
					eyebrow="Why families choose us"
					title="Training built around your child"
					description="Every part of our program is designed for how young players actually learn and grow."
				/>

				<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{differentiators.map((item, i) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.05 }}
							className="rounded-2xl border border-border bg-card p-5"
						>
							<span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
								<item.icon className="size-5" aria-hidden />
							</span>
							<h3 className="mt-4 text-sm font-semibold text-foreground">
								{item.title}
							</h3>
							<p className="mt-1.5 text-sm text-muted-foreground">
								{item.description}
							</p>
						</motion.div>
					))}
				</div>
			</section>

			{/* Programs */}
			<section id="programs" className="bg-muted/40 py-16 sm:py-20">
				<div className="mx-auto max-w-6xl px-4 sm:px-6">
					<SectionHeading
						eyebrow="Programs"
						title="An age-appropriate path for every player"
						description="From first touches to competitive play, players move through programs matched to their stage."
					/>

					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{programs.map((program, i) => (
							<motion.div
								key={program.name}
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-60px' }}
								transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.08 }}
								className="flex flex-col rounded-2xl border border-border bg-card p-6"
							>
								<span className="text-xs font-bold uppercase tracking-wide text-accent-foreground">
									{program.ageRange}
								</span>
								<h3 className="mt-1.5 text-lg font-semibold text-foreground">
									{program.name}
								</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									{program.description}
								</p>
								<ul className="mt-4 space-y-2">
									{program.points.map((point) => (
										<li
											key={point}
											className="flex items-start gap-2 text-sm text-foreground"
										>
											<CheckCircle2
												className="mt-0.5 size-4 shrink-0 text-accent-foreground"
												aria-hidden
											/>
											{point}
										</li>
									))}
								</ul>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<PlayerOfTheWeekMarquee />
			<GallerySection />

			{/* Testimonials */}
			<section
				id="testimonials"
				className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
			>
				<SectionHeading
					eyebrow="What parents say"
					title="Trusted by families like yours"
				/>

				<div className="mt-10 grid gap-5 md:grid-cols-3">
					{testimonials.map((t, i) => (
						<motion.figure
							key={t.role}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.08 }}
							className="rounded-2xl border border-border bg-card p-6"
						>
							<blockquote className="text-sm text-foreground">
								&ldquo;{t.quote}&rdquo;
							</blockquote>
							<figcaption className="mt-4 text-xs font-medium text-muted-foreground">
								{t.role}
							</figcaption>
						</motion.figure>
					))}
				</div>
			</section>

			{/* Contact / CTA */}
			<section
				id="contact"
				className="relative overflow-hidden bg-sidebar text-sidebar-foreground"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 overflow-hidden"
				>
					<div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/10" />
				</div>

				<div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
					<h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
						Ready for your child's first{' '}
						<span className="text-primary">lesson</span>?
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-sm text-sidebar-foreground/70 sm:text-base">
						Reach out and we'll match your child with the right program and
						coach to get started.
					</p>

					<div className="mt-7 flex flex-wrap justify-center gap-3">
						<Button asChild size="lg">
							<a href="mailto:info@Kapikidsacademy.com">
								<Mail className="size-4" aria-hidden />
								Email us - info@Kapikidsacademy.com
							</a>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
						>
							<a href="tel:+233244360963">
								<Phone className="size-4" aria-hidden />
								Call us - 0244360963
							</a>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
						>
							<a
								href="https://wa.me/233246153930"
								target="_blank"
								rel="noreferrer"
							>
								<MessageCircle className="size-4" aria-hidden />
								WhatsApp - 233246153930
							</a>
						</Button>
					</div>

					<div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-sidebar-foreground/70">
						<a
							href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
								'Makers House Astroturf',
							)}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-75"
							aria-label="Get directions to Makers House Astroturf"
						>
							<MapPin className="size-4 shrink-0 text-primary" aria-hidden />
							<span>Makers House Astroturf</span>
						</a>
						<span className="flex items-center gap-1.5">
							<CalendarClock
								className="size-4 shrink-0 text-primary"
								aria-hidden
							/>
							Saturdays: 8am–10am
						</span>
					</div>
				</div>
			</section>

			<footer className="border-t border-border bg-background">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
					<div className="flex items-center gap-2">
						<AcademyLogo className="size-8" />
						<span className="text-sm font-semibold text-foreground">
							Kapikids Soccer Academy
						</span>
					</div>
					<p className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} Kapikids Soccer Academy. All rights
						reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
