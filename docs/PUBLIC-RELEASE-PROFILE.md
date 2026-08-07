# Shadowframe Public Release Profile

This document defines the public-facing Shadowframe product profile.

It does **not** describe the creator/private build currently used on the development machine. The creator build remains the advanced local studio. The public build is the installable Windows release intended for general users running the app locally on their own GPU.

## Product split

- `creator` profile
  - private/local studio build
  - advanced tabs
  - raw model and LoRA controls
  - freeform prompt workflow

- `public` profile
  - installable Windows release
  - SFW-only
  - curated tool tabs
  - locked model/workflow pairings
  - simplified guided text input

## Public release principles

- Local-first: runs on the user’s own PC and GPU
- No paid cloud inference dependency
- No generalized freeform generation console
- No NSFW tooling, prompts, or public presets
- Safer guided experiences with predictable outcomes

## Public tool suite

The first public-profile pass maps named tools onto approved local workflows:

1. Anime Style
2. Photo Restyle
3. Bring Photo to Life
4. Motion Scene
5. Wardrobe Swap (only when the SFW replacement runtime is enabled and packaged)

## Public UI differences

Compared with the creator build, the public build:

- renames raw mode tabs into named creative tools
- hides raw base model selection
- hides raw LoRA selection
- hides negative prompting
- hides seed controls
- hides custom resolution entry
- keeps only simplified, guided creative-direction input
- keeps only limited advanced controls needed for safe public use

## Public safety rules

The public profile rejects:

- sexual or explicit prompt language
- sexualized anatomy requests
- transparent / see-through sexualized clothing requests
- nudity requests
- minor-related content
- sexual violence or coercion
- sexual content involving animals

The public profile also restricts generation to approved model/style combinations only.

## Approved public workflow pairings

Current starter mappings:

- `txt-img` → Anima Aesthetic v1.1 + Soft Anime
- `img-img` → Anima Aesthetic v1.1 + Xipa
- `img-vid` → Wan 2.2 I2V-A14B + 2D Animation
- `txt-vid` → Wan 2.2 T2V 14B
- `outfit` → CatVTON runtime only when explicitly enabled for the release

These mappings are intentionally locked in the public profile.

## Build behavior

- The public web build injects `NEXT_PUBLIC_SHADOWFRAME_PROFILE=public`
- The default app behavior remains `creator`
- The creator build should remain the default unless a release build explicitly opts into the public profile

## Current Phase 2 status

Phase 2 now has the core public-product layer in place:

- named public tool tabs replace raw generation-mode labels
- public tabs use guided, tool-specific titles, prompts, hints, and empty states
- public profile hides raw model selection, raw LoRA selection, negative prompting, seed controls, and custom sizing
- public-safe workflow pairings are locked by profile
- public API calls reject unapproved model/style combinations and explicit sexual prompt language
- creator mode remains the default and is still untouched unless a release build explicitly opts into `public`

## Phase 3 public-release packaging status

The public-release pipeline now targets a separate packaging path:

- the Core build can be compiled with `Profile=public`
- the public installer can be built with `-PublicRelease`
- the public Core runtime writes a `release-profile.json` marker and starts the local bridge with the `public` profile enabled
- the public installer package includes only SFW sample prompts
- public image uploads are validated before they reach ComfyUI

## Next implementation steps

1. Add deeper image-content moderation if a reliable local/public-safe classifier is chosen later
2. Update Windows installer packaging visuals/copy to call out “public release” more explicitly
3. Add a release-QA checklist for creator vs public regression testing
4. Keep the creator/private local studio unchanged
