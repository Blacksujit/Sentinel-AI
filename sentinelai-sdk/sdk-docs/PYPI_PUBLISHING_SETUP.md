# PYPI PUBLISHING SETUP GUIDE

## Step 1: Get TestPyPI Account
1. Go to https://test.pypi.org/account/register/
2. Create your TestPyPI account
3. Verify your email

## Step 2: Get API Token
1. Login to TestPyPI: https://test.pypi.org/
2. Go to Account Settings â†’ API tokens
3. Add API token
4. Name: "sentinelai-risk"
5. Scope: "Entire account" (or specific project)
6. Copy the generated token

## Step 3: Configure .pypirc
Edit ~/.pypirc (or D:\Sentinel-AI\.pypirc) and replace:
- `your-testpypi-api-token-here` with your actual TestPyPI token
- `your-pypi-api-token-here` with your real PyPI token (when ready)

## Step 4: Publish to TestPyPI
```bash
cd D:\Sentinel-AI\sentinelai-sdk
python -m twine upload --repository testpypi dist/*
```

## Step 5: Test Installation
```bash
# Install from TestPyPI
pip install --index-url https://test.pypi.org/simple/ sentinelai-risk

# Test it works
python -c "from sentinelai import SentinelAIClient; print('✅ SDK installed from TestPyPI!')"
```

## Step 6: Publish to Real PyPI (when ready)
```bash
# Get real PyPI token from https://pypi.org/
# Update .pypirc with real token
python -m twine upload dist/*
```

## Alternative: Use Username/Password (if you prefer)
Instead of tokens, you can use username/password:
```bash
python -m twine upload --repository testpypi --username your-username --password your-password dist/*
```

## Quick Fix for Now
If you want to publish immediately without .pypirc:
```bash
python -m twine upload --repository testpypi --username __token__ --password YOUR_TEST_TOKEN_HERE dist/*
```
