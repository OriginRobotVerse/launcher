from setuptools import setup, find_packages

setup(
    name="origin-client",
    version="0.2.0",
    description="Python client for the Origin server API",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "requests>=2.28.0",
        "sseclient-py>=1.7.2",
    ],
)
