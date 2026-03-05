# 🛒 ArgoCD Marketplace

**A beautiful, production-grade web UI for browsing, configuring, and deploying Helm charts through ArgoCD — using a GitOps-native app-of-apps pattern.**

Built with React 18, Material UI 5 (dark theme), Monaco Editor, Express, and the Kubernetes API.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Real-time view of all ArgoCD applications — health, sync status, resources |
| **Marketplace** | Search Artifact Hub for Helm charts, browse with logos + metadata |
| **Deploy Wizard** | Select chart → edit values (Monaco YAML editor) → configure namespace & sync policy → one-click deploy |
| **Live Progress** | WebSocket-powered real-time deploy progress: git commit → push → ArgoCD detect → sync → healthy |
| **App Detail** | Per-app resources table, sync history, source info, sync/refresh/delete controls |
| **GitOps Native** | Deploys by writing ArgoCD Application YAML to your git repo — no imperative kubectl |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 Browser (React + MUI)            │
│  Dashboard │ Marketplace │ Deploy │ App Detail   │
└────────────┬───────────────────────┬─────────────┘
             │ REST API              │ WebSocket
┌────────────▼───────────────────────▼─────────────┐
│              Express Backend (Node.js)            │
│  /api/apps │ /api/marketplace │ /api/deploy │ /ws │
└──────┬──────────┬───────────────────┬────────────┘
       │          │                   │
  K8s API    Artifact Hub API    Git (simple-git)
  (ArgoCD)   (chart search)      (local-k8s-platform)
```

## 📋 Prerequisites

1. **[local-k8s-platform](https://github.com/Karthik-Chowdary/local-k8s-platform)** — running k3d cluster with ArgoCD and app-of-apps pattern
2. **Node.js** ≥ 18
3. **kubectl** configured to reach your cluster
4. **Git** — the `local-k8s-platform` repo must be cloned and have a remote configured

```bash
# Verify prerequisites
kubectl get applications -n argocd   # Should show app-of-apps + child apps
ls ~/local-k8s-platform/apps/        # Should have ArgoCD Application YAMLs
```

## ⚡ Quick Start

```bash
# Clone
git clone https://github.com/Karthik-Chowdary/argo-marketplace.git
cd argo-marketplace

# Install dependencies
npm install

# Start both frontend + backend in dev mode
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api/health
- **WebSocket:** ws://localhost:3001/ws

## 🔧 Configuration

Environment variables (backend):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `LOCAL_K8S_PLATFORM_PATH` | `/home/ubuntu/local-k8s-platform` | Path to the git repo |
| `ARGOCD_NAMESPACE` | `argocd` | ArgoCD namespace |
| `MOCK_K8S` | `false` | Use mock data (no cluster needed) |
| `LOG_LEVEL` | `info` | winston log level |

## 🚀 Deploy to Kubernetes

```bash
# Build the Docker image
docker build -t argo-marketplace:latest .

# Import into k3d
k3d image import argo-marketplace:latest -c local-k8s-platform

# Apply K8s manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Access at http://marketplace.localhost
```

Or add it as an ArgoCD app in your `local-k8s-platform/apps/` directory!

## 📁 Project Structure

```
argo-marketplace/
├── frontend/                # React + TypeScript + MUI 5 + Vite
│   ├── src/
│   │   ├── components/      # AppCard, ChartCard, DeployStepper, Layout, etc.
│   │   ├── pages/           # Dashboard, Marketplace, AppDetail, Deploy
│   │   ├── hooks/           # useApi (TanStack Query), useWebSocket
│   │   ├── services/        # API client functions
│   │   ├── theme/           # Custom dark MUI theme
│   │   ├── types/           # TypeScript interfaces
│   │   └── store/           # Zustand state management
│   └── vite.config.ts       # Vite config with API proxy
├── backend/                 # Express + TypeScript
│   ├── src/
│   │   ├── routes/          # apps, marketplace, deploy
│   │   ├── services/        # kubernetes, artifactHub, gitDeploy
│   │   ├── websocket/       # WebSocket server for live updates
│   │   ├── middleware/       # Error handler, winston logger
│   │   └── types/           # Shared type definitions
│   └── tsconfig.json
├── k8s/                     # Kubernetes deployment manifests
│   ├── namespace.yaml
│   ├── rbac.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local dev with Docker
└── README.md
```

## 🎨 Design

- **Dark theme** — deep navy background with cyan/purple gradient accents
- **Glass-morphism cards** — backdrop blur, subtle borders
- **Framer Motion** — smooth page transitions, animated deploy stepper
- **Monaco Editor** — full YAML editing for Helm values
- **Responsive** — works on desktop and tablet

## 🔄 How Deploy Works

1. User searches Artifact Hub → selects a chart
2. Reviews/edits Helm values in Monaco editor
3. Configures app name, namespace, sync policy
4. Clicks **Deploy**
5. Backend generates ArgoCD `Application` YAML
6. Writes to `local-k8s-platform/apps/{name}.yaml`
7. Git commits and pushes
8. ArgoCD's app-of-apps detects the new Application
9. ArgoCD syncs and deploys the chart
10. Progress streams to the UI via WebSocket in real-time

## 📄 License

MIT
