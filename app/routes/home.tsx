// import type { Route } from "./+types/home";
// import { Welcome } from "../welcome/welcome";

// export function meta({}: Route.MetaArgs) {
// 	return [
// 		{ title: "New React Router App" },
// 		{ name: "description", content: "Welcome to React Router!" },
// 	];
// }

// export function loader({ context }: Route.LoaderArgs) {
// 	return { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
// }

// export default function Home({ loaderData }: Route.ComponentProps) {
// 	return <Welcome message={loaderData.message} />;
// }


import { useState } from "react";

export default function Home() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [message, setMessage] = useState("");

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		const res = await fetch("/api/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email,
				password,
				displayName,
			}),
		});

		const data = (await res.json()) as { error?: string };

		if (!res.ok) {
			setMessage(data.error || "Something went wrong");
			return;
		}

		setMessage("Account created!");
	}

	return (
		<main style={{ padding: 40 }}>
			<h1>Register</h1>

			<form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
				<input
					placeholder="Display name"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
				/>

				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>

				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				<button type="submit">Register</button>
			</form>

			<p>{message}</p>
		</main>
	);
}