# Heroku Deployment Guide

## Prerequisites
1. Heroku CLI installed
2. Git repository initialized
3. All dependencies installed locally

## Steps to Deploy

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app:**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables (if needed):**
   ```bash
   heroku config:set NODE_ENV=production
   ```

4. **Deploy to Heroku:**
   ```bash
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku main
   ```

5. **Open your app:**
   ```bash
   heroku open
   ```

## Important Notes

- The app will automatically build the React frontend during deployment using the `heroku-postbuild` script
- Make sure your CSV files (`belmont-properties.csv` and `fy2025-property-assessment.csv`) are committed to the repository
- The app serves both the API and the React frontend from the same server
- If you encounter issues, check the logs with: `heroku logs --tail`

## Troubleshooting

If the app crashes:
1. Check logs: `heroku logs --tail`
2. Ensure all dependencies are in the root `package.json`
3. Verify the `Procfile` exists and is correct
4. Make sure CSV files are present in the backend directory
