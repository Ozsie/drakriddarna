
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/editor" | "/tiles";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/editor": Record<string, never>;
			"/tiles": Record<string, never>
		};
		Pathname(): "/" | "/tiles";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.nojekyll" | "/favicon.png" | "/music/explore.mp3" | "/music/tension.mp3" | "/sfx/arrow.mp3" | "/sfx/attack_knight.wav" | "/sfx/attack_monster.wav" | "/sfx/buff.mp3" | "/sfx/button.mp3" | "/sfx/critical_hit.mp3" | "/sfx/debuff.mp3" | "/sfx/diary_add.mp3" | "/sfx/die2_monster.wav" | "/sfx/die_boss.wav" | "/sfx/die_knight.wav" | "/sfx/die_monster.wav" | "/sfx/door_open.mp3" | "/sfx/draw_event.mp3" | "/sfx/drop.mp3" | "/sfx/drums.mp3" | "/sfx/failure.mp3" | "/sfx/fireball.mp3" | "/sfx/hurt2_monster.wav" | "/sfx/hurt3_monster.wav" | "/sfx/hurt_knight.wav" | "/sfx/hurt_monster.wav" | "/sfx/level_up.mp3" | "/sfx/locked.mp3" | "/sfx/miss.mp3" | "/sfx/monster_scream.mp3" | "/sfx/paralyze.mp3" | "/sfx/pick_up.mp3" | "/sfx/roar.mp3" | "/sfx/rubble.mp3" | "/sfx/search.mp3" | "/sfx/shield_block.mp3" | "/sfx/shuffle.mp3" | "/sfx/sun.mp3" | "/sfx/trap_fall.mp3" | "/sfx/unlock.mp3" | "/sfx/walk_boss.wav" | "/sfx/walk_knight.wav" | "/sprites/items.png" | "/sprites/knight.png" | string & {};
	}
}