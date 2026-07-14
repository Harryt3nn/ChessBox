Tech Stack
{
  "Electron"
  "React"
  "TypeScript"
  "Fastify"
  "tRPC"
  "PostgreSQL"
  "Prisma ORM"
  "hash-wasm"
  "SendGrid"
  "JWT"
  "Redis"
  "AWS"
  "Docker"
  "zod"
}


File structure

CHESSBOX/
├── .gitignore
├── docker-compose.yml
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
│
├── apps/
│   ├── api/
│   │   ├── .env
│   │   ├── .gitignore
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── prisma.config.ts
│   │   ├── Documentation/
│   │   │   ├── ARCHITECTURE.md
│   │   │   └── TODO.md
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── index.ts
│   │
│   └── desktop/
│       ├── .eslintrc.json
│       ├── forge.config.ts
│       ├── package.json
│       ├── package-lock.json
│       ├── tsconfig.json
│       ├── webpack.main.config.ts
│       ├── webpack.plugins.ts
│       ├── webpack.renderer.config.ts
│       ├── webpack.rules.ts
│       ├── config/
│       │   └── blacklist.json
│       ├── documentation/
│       │   ├── AnalysisBoard.md
│       │   ├── ARCHITECTURE.md
│       │   └── TODO.md
│       ├── node_modules/
│       ├── public/
│       │   └── icons/
│       └── src/
│           ├── index.html
│           ├── index.css
│           ├── main.ts
│           ├── preload.ts
│           ├── renderer.tsx
│           ├── App.tsx
│           ├── components/
│           │   ├── logIn.tsx
│           │   ├── FolderSelection.tsx
│           │   ├── importANB.tsx
│           │   ├── ImportModal.tsx
│           │   ├── RepertoireRow.tsx
│           │   ├── buttons/
│           │   │   ├── analyticsButton.tsx
│           │   │   ├── boardButton.tsx
│           │   │   ├── homeButton.tsx
│           │   │   ├── noveltyFinderButton.tsx
│           │   │   ├── repertoiresButton.tsx
│           │   │   ├── repVisButton.tsx
│           │   │   ├── settingsButton.tsx
│           │   │   └── toolsButton.tsx
│           │   └── importsAndExports/
│           │       ├── prepareForImport.ts
│           │       └── validateChessGraphExport.ts
│           ├── pages/
│           │   ├── Analytics.tsx
│           │   ├── BoardView.tsx
│           │   ├── Community.tsx
│           │   ├── EditRepertoires.tsx
│           │   ├── NoveltyFinder.tsx
│           │   ├── Profile.tsx
│           │   ├── RepVis.tsx
│           │   ├── Settings.tsx
│           │   └── TrainingToolkit.tsx
│           ├── Storage/
│           │   ├── FileSystemStorageProvider.ts
│           │   ├── ImportService.ts
│           │   ├── MainStorage.ts
│           │   ├── RepList.tsx
│           │   └── StorageProvider.ts
│           └── types/
│               ├── Folder.ts
│               ├── gameTree.ts
│               ├── global.d.ts
│               ├── ImportPayload.ts
│               ├── moveNode.ts
│               ├── Node.ts
│               ├── Page.ts
│               └── Repertoire.ts
│
└── packages/
    ├── documentation/
    └── shared/
        ├── node_modules/
        ├── package.json
        ├── package-lock.json
        └── src/