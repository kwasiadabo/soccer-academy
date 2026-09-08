import { motion } from 'framer-motion';

export function SectionHeading({
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
