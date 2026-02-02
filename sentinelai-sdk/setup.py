from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="sentinelai-sdk",
    version="1.0.0",
    author="SentinelAI Team",
    author_email="support@sentinelai.com",
    description="Official Python SDK for SentinelAI AI safety platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourcompany/sentinelai",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Security",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov>=2.0",
            "black>=21.0",
            "flake8>=3.8",
        ],
    },
    keywords="ai safety security monitoring chatbot moderation",
    project_urls={
        "Documentation": "https://docs.sentinelai.com",
        "Source": "https://github.com/yourcompany/sentinelai",
        "Tracker": "https://github.com/yourcompany/sentinelai/issues",
    },
)
