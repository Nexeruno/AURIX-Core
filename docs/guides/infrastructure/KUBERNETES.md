# Kubernetes Setup — lokální cluster s minikube

## 📋 Přehled

Projekt běží v Kubernetes clusteru (minikube) se dvěma Deploymenty:
- **frontend** — React SPA na nginx (2 repliky, HPA 2–5)
- **firebase-emulator** — Firebase Auth/Firestore/Functions lokálně (1 replika, PVC)

Architektura:
```
minikube (namespace: evidence-vydaju)
├── Deployment: frontend (nginx:alpine)
├── Deployment: firebase-emulator (node:20 + firebase-tools)
├── Service: frontend-svc (NodePort :30080)
├── Service: emulator-svc (ClusterIP :4000/:8080/:9099/:5001)
├── Ingress: / → frontend, /emulator → emulator UI
├── HPA: frontend (CPU 70%, 2–5 replicas)
└── PVC: emulator-data (1Gi, RWO)
```

---

## 🚀 Prerekvizity

### Na tvém počítači:

```bash
# Minikube (https://minikube.sigs.k8s.io/)
brew install minikube  # macOS
# nebo windows/linux instrukce z webu

# kubectl (https://kubernetes.io/docs/tasks/tools/)
brew install kubectl

# Docker CLI (pro build image)
# Už máš nainstalovaný (vite dev server běží)
```

### Verze:
```bash
minikube version  # ≥ 1.30
kubectl version   # ≥ 1.26
docker --version  # ≥ 20.x
```

---

## ⚙️ 1. Spustit minikube cluster

```bash
# Start s 4 CPU a 4GB RAM
minikube start \
  --cpus=4 \
  --memory=4096 \
  --driver=docker \
  --container-runtime=docker

# Ověř, že běží
minikube status
```

### Enable addons:
```bash
# Ingress controller (potřeba pro nginx ingress)
minikube addons enable ingress

# Optional: Metrics server (pro HPA)
minikube addons enable metrics-server
```

---

## 🐳 2. Buildovat Docker image

### Standard build (GitHub Pages):
```bash
# Builduje s --base=/Evidence-v-daj-/
docker build \
  --build-arg BASE_PATH=/Evidence-v-daj-/ \
  --build-arg VITE_FIREBASE_PROJECT_ID=<your-project-id> \
  --build-arg VITE_FIREBASE_API_KEY=<your-firebase-web-api-key> \
  -t evidence-vydaju-frontend:latest .
```

### K8s build (minikube root path):
```bash
# Builduje s --base=/ (pro servírování z root v clusteru)
docker build \
  --build-arg BASE_PATH=/ \
  --build-arg VITE_FIREBASE_PROJECT_ID=<your-project-id> \
  --build-arg VITE_FIREBASE_API_KEY=<your-firebase-web-api-key> \
  -t evidence-vydaju-frontend:latest .
```

### Načti image do minikube:
```bash
minikube image load evidence-vydaju-frontend:latest

# Ověř:
minikube image ls | grep evidence-vydaju-frontend
```

---

## 🔐 3. Nastavit Secrets

Zkopíruj template a vyplň citlivé hodnoty:
```bash
cp k8s/secret.yaml.example k8s/secret.yaml
```

Uprav `k8s/secret.yaml` a vložit:
- `FIREBASE_ADMIN_KEY` — service account JSON z Firebase Console

**NIKDY** nedávej `secret.yaml` do gitu (je v `.gitignore`).

---

## 📦 4. Deploy do minikube

### Všechno najednou (kustomize):
```bash
kubectl apply -k k8s/
```

### Nebo manuálně:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-hpa.yaml
kubectl apply -f k8s/emulator-pvc.yaml
kubectl apply -f k8s/emulator-deployment.yaml
kubectl apply -f k8s/emulator-service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 🔍 5. Ověření deployment

```bash
# Podívej se na pody
kubectl get pods -n evidence-vydaju
# Měl bys vidět: frontend-xxxx (2x), firebase-emulator-xxxx (1x)

# Podívej se na services
kubectl get svc -n evidence-vydaju
# frontend-svc (NodePort), emulator-svc (ClusterIP)

# Ingress
kubectl get ingress -n evidence-vydaju

# HPA
kubectl get hpa -n evidence-vydaju
# frontend-hpa REFERENCE TARGET ... (ukazuje CPU %)

# Liveness/readiness probes
kubectl describe pod <frontend-pod-name> -n evidence-vydaju
# Měl bys vidět: Liveness probe passed / Readiness probe passed
```

---

## 🌐 6. Přístup k aplikaci

### Frontend (nginx):

```bash
# Get URL
minikube service frontend-svc -n evidence-vydaju --url

# Nebo manuálně:
minikube ip
# Pak otevři: http://<minikube-ip>:30080
```

### Firebase Emulator UI:

```bash
# Option A: Port forward
kubectl port-forward svc/emulator-svc 4000:4000 -n evidence-vydaju

# Pak: http://localhost:4000

# Option B: Ingress (pokud poběží minikube tunnel)
minikube tunnel
# Pak: http://localhost/emulator
```

---

## 📊 7. Monitoring a Scaling

### Podívej se na HPA v reálném čase:
```bash
kubectl get hpa -n evidence-vydaju -w

# Měníš se počet replik podle CPU load
# Limit: 2–5 replik, trigger: 70% CPU
```

### Ručně scale frontend:
```bash
kubectl scale deployment frontend \
  --replicas=3 -n evidence-vydaju
```

### Podívej se na logs:
```bash
# Frontend
kubectl logs -f deployment/frontend -n evidence-vydaju

# Emulator
kubectl logs -f deployment/firebase-emulator -n evidence-vydaju
```

---

## 🔄 8. Rolling update (nulový downtime)

Když chceš updatovat image (třeba nová verze):

```bash
# Rebuild image s novým tagem
docker build -t evidence-vydaju-frontend:v1.1 .

# Load do minikube
minikube image load evidence-vydaju-frontend:v1.1

# Update deployment
kubectl set image deployment/frontend \
  nginx=evidence-vydaju-frontend:v1.1 \
  -n evidence-vydaju

# Ověř, že update proběhl bez downtime
kubectl rollout status deployment/frontend -n evidence-vydaju
```

---

## 🧹 9. Cleanup

```bash
# Smaž všechno v namespace
kubectl delete namespace evidence-vydaju

# Nebo smaž jen některé resources
kubectl delete deployment/frontend -n evidence-vydaju
kubectl delete svc/frontend-svc -n evidence-vydaju

# Stop minikube (zachová data)
minikube stop

# Resetuj minikube (smaže vše)
minikube delete
```

---

## 🐛 Troubleshooting

### Pod se nespustí (CrashLoopBackOff):
```bash
kubectl describe pod <pod-name> -n evidence-vydaju
kubectl logs <pod-name> -n evidence-vydaju
```

### Image nenalezen:
```bash
# Zkontroluj, že je image v minikube
minikube image ls | grep evidence-vydaju

# Pokud ne: minikube image load evidence-vydaju-frontend:latest
```

### HPA neudělá nic:
```bash
# Zkontroluj, že metrics-server běží
kubectl get deployment metrics-server -n kube-system

# Podívej se na HPA status
kubectl describe hpa frontend-hpa -n evidence-vydaju
```

### Ingress nefunguje:
```bash
# Zkontroluj, že addon běží
minikube addons list | grep ingress

# Pokud ne:
minikube addons enable ingress
```

---

## 📚 Další zdroje

- [Minikube dokumentace](https://minikube.sigs.k8s.io/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [K8s best practices](https://kubernetes.io/docs/concepts/configuration/overview/)

---

## 🎓 DevOps/K8s learnings z tohoto setupu

1. **Multi-container orchestration** — frontend + emulator v jednom clusteru
2. **Rolling deployments** — nulový downtime updates
3. **HPA (Horizontal Pod Autoscaler)** — automatické škálování
4. **ConfigMap vs Secret** — oddělení config od citlivých dat
5. **PersistentVolumes** — data přežijí restart podu
6. **Probes (liveness/readiness)** — zdravotní kontroly
7. **Ingress** — API gateway pro routování
8. **Namespace isolation** — vše pod `evidence-vydaju` namespace
