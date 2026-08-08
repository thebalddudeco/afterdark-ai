# Shadowframe AI v0.3.7

Public Windows release

What this release includes
- One-file Windows setup app: `Shadowframe.Setup.exe`
- The setup app installs Shadowframe Core automatically
- During setup, the public Anima, Wan, and PhotoReal model packs are downloaded automatically from Hugging Face
- SFW sample prompts are installed automatically
- Input, output, temp, state, and models folders are created automatically inside the chosen Shadowframe folder

What changed in v0.3.7
- Simplified the public GitHub release page so the intended user download is a single setup file
- Removed extra companion assets from the public release page to reduce confusion
- Kept the automatic public model-pack download flow inside setup
- Carried forward the public startup fix that prevents false five-minute launcher timeout failures
- Preserved the up-front disk-space warning for large public model packs

Download flow
1. Download `Shadowframe.Setup.exe`
2. Run it
3. Choose your Shadowframe install folder
4. Let Setup download and install the required public model packs automatically
5. Launch Shadowframe AI from the installed copy

Notes
- GitHub will still show its automatic source-code archives on the release page. Normal users should ignore those and download `Shadowframe.Setup.exe`.
- The public model packs are large, especially Wan and PhotoReal, so setup can take a while depending on your connection speed and disk performance.
