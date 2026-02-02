from setuptools import setup

setup(
    name="sentinelai_sdk",
    version="1.0.0",
    author="SentinelAI Team",
    author_email="support@sentinelai.com",
    description="Official Python SDK for SentinelAI AI safety platform",
    py_modules=["sentinelai_sdk"],
    install_requires=[
        "requests>=2.25.0",
    ],
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
)
