## Web to Deb Builder
A desktop application built with Electron to convert web applications into Debian package (.deb) installers for Linux distributions (such as Debian, Ubuntu, and Cutefish OS).

## Features
Simple and intuitive desktop interface \
Package web apps into native .deb installers \
Built with Electron, HTML5, and vanilla JavaScript 

``` 
Project Structure
├── index.html          # Main application UI layout
├── renderer.js         # Frontend interactive logic
├── main.js             # Electron main process
├── package.json        # Dependencies and build configuration
├── package-lock.json   # Exact dependency lockfile
├── .gitignore          # Ignores build artifacts and node_modules
└── README.md           # Documentation
```
## Prerequisites
Ensure you have the following installed on your Linux system:

- Node.js (v18 or newer recommended)
- npm (comes with Node.js)
- dpkg-deb / build tools (typically pre-installed on Debian/Ubuntu): \
``` sudo apt update && sudo apt install dpkg binutils fakeroot -y```

## Getting Started
1. Clone the repository \
``` git clone https://github.com/tsanaung/web_to_deb.git ``` \
``` cd web_to_deb ``` 
2. Install dependencies \
``` npm install ``` 
3. Run the application \
``` npm start ``` 

## Building & Packaging
To create release bundles or Debian installers, run:

``` npm run build ```
(Check package.json for customized scripts and output directories)

License
MIT
