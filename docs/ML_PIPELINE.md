# 🤖 ML Pipeline Documentation

## Level 1: Baseline Expense Predictor

### Overview
The ML Pipeline Level 1 is a **scheduled autonomous service** that generates expense predictions for users based on their historical spending patterns. It uses **simple statistical baselines** (no external ML models) and runs automatically every **3 days**.

### How It Works

#### 1. **Scheduled Execution**
- **Trigger:** Google Cloud Pub/Sub Scheduled Event
- **Schedule:** Every 3 days (72 hours)
- **Function:** `exports.runMlPipeline` in `functions/index.js`
- **Region:** europe-west1

#### 2. **Data Flow**
```
1. Load all users from Firestore
2. For each user:
   a. Load all transactions (vydaje only)
   b. Calculate features (monthly expenses by category)
   c. Generate baseline prediction
   d. Save prediction to user's mlPredictions collection
3. Log pipeline execution to mlRuns collection
```

#### 3. **Prediction Algorithm (Baseline)**
```javascript
// Input: User's transaction history
// Output: Predicted expenses for next month

1. Group expenses by month
2. Calculate 3-month and 6-month averages
3. Weighted average: 60% recent (3m) + 40% historical (6m)
4. Scale by category proportions
5. Assess confidence based on spending consistency
```

**Confidence Scoring:**
- **High:** Variance < 20% between last 3 months
- **Medium:** Variance 20-40% OR fewer than 3 full months of data
- **Low:** Inconsistent patterns or minimal data

### Data Structures

#### Predictions Collection
**Path:** `users/{uid}/mlPredictions/{predictionId}`

```json
{
  "month": "2026-07",
  "totalPredictedExpense": 5420,
  "categories": {
    "food": 1200,
    "transport": 800,
    "entertainment": 400,
    "other": 3020
  },
  "confidence": "high",
  "modelType": "average-baseline",
  "modelVersion": "expense-predictor-baseline-v1",
  "features": {
    "avg3m": 5400,
    "avg6m": 5150,
    "dataPoints": 47
  },
  "createdAt": "2026-06-02T14:30:00Z"
}
```

#### Pipeline Run Logs
**Path:** `mlRuns/{runId}`

```json
{
  "status": "success",
  "pipelineLevel": 1,
  "modelVersion": "expense-predictor-baseline-v1",
  "startedAt": "2026-06-02T14:00:00Z",
  "finishedAt": "2026-06-02T14:30:00Z",
  "usersProcessed": 12,
  "predictionsCreated": 11,
  "durationMs": 1800,
  "errorMessage": null,
  "errorCode": null
}
```

### Firestore Security Rules

#### User Predictions (Read-Only for User)
```
match /users/{uid}/mlPredictions/{document=**} {
  allow read: if request.auth.uid == uid;
  allow write: if false;  // Cloud Functions only
}
```

#### Pipeline Runs (Admin Only)
```
match /mlRuns/{document=**} {
  allow read: if isAdmin(request.auth.uid);
  allow write: if false;  // Cloud Functions only
}
```

### Frontend Integration

#### User View
- **Location:** Admin Panel → "🤖 Predikce" Tab
- **Component:** `src/components/admin/MLPredictionPanel.jsx`
- **Features:**
  - Displays latest predictions (12 most recent)
  - Shows total predicted expense with category breakdown
  - Displays confidence level with visual indicator
  - Shows data features (3m avg, 6m avg, data points)

#### Admin View
- **Additional Section:** "🔧 Pipeline běhy" (admin-only)
- **Shows:**
  - Pipeline execution history (last 5 runs)
  - Status (success/failed)
  - Users processed & predictions created
  - Error logs with error codes

### Testing the Pipeline

#### Manual Trigger (Admin Only)
Currently, the pipeline runs automatically. To manually inspect logs:

```bash
# View recent pipeline runs in Firestore
firebase firestore --project <PROJECT_ID>
# Path: mlRuns

# View a user's predictions
# Path: users/{uid}/mlPredictions
```

#### Expected Logs
The pipeline logs all operations to Firebase Cloud Functions logs:

```
event: mlPipeline_started
event: mlPipeline_usersLoaded (count: X)
event: mlPipeline_predictionSaved (per user)
event: mlPipeline_completed
```

### Next Steps (Level 2 - Python ML Pipeline)

The Level 2 pipeline will:
- Use Python with scikit-learn for feature engineering
- Implement actual ML models (Random Forest, LSTM)
- Include anomaly detection
- Support multi-step predictions
- Require a separate Cloud Run deployment

### Troubleshooting

#### Pipeline Not Running?
1. Check Cloud Scheduler status in Google Cloud Console
2. Verify `runMlPipeline` function exists in Firebase
3. Check Cloud Functions logs for errors

#### No Predictions Showing?
1. Ensure user has at least 1 month of transaction history
2. Check Firestore rules allow user read on mlPredictions
3. Manually check `users/{uid}/mlPredictions` in Firebase Console

#### Low Confidence Predictions?
- This is expected for new users or highly variable spenders
- Predictions improve with more consistent spending patterns
- Confidence = "low" means variance is >40%

### Performance

- **Execution Time:** ~1.5-3 seconds per 100 users
- **Firestore Reads:** 1 (users) + 1 (per user transactions)
- **Firestore Writes:** 1 (per user prediction) + 1 (pipeline log)
- **Max Users:** 500+ per run (timeout: 540 seconds)

### Cost Estimate (Monthly)

- **Cloud Functions:** ~$0.40/month (runs 10 times/month)
- **Firestore:** ~$0.10/month (reads/writes)
- **Total:** < $1/month
