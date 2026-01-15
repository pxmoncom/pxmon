from setuptools import setup, find_packages

setup(
    name="pxmon-agents",
    version="0.1.0",
    description="PXMON AI Agent Framework",
    author="pxmon",
    packages=find_packages(),
    package_dir={"": "."},
    python_requires=">=3.10",
    install_requires=[
        "solana>=0.30.0",
        "anchorpy>=0.18.0",
        "httpx>=0.25.0",
        "pydantic>=2.5.0",
        "rich>=13.7.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.23.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "pxmon-agent=src.agent:main",
        ],
    },
)