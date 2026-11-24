
<div align="center">

# ClankSnap

### Turn Long Videos Into Short-Form Clips

An AI-assisted video clipping application based on the original [NeonClipping](https://github.com/iamajmeena/neonclipping) project, featuring a redesigned React + Vite frontend and the existing Python backend.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-Backend-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

[GitHub Repository](https://github.com/Ashwanikumar6/Clanksnap) | [Original Project](https://github.com/iamajmeena/neonclipping)

</div>

---

## About ClankSnap

ClankSnap is an AI-assisted short-form video clipping application designed to help creators transform long videos into shorter, engaging clips.

The project is based on the original NeonClipping application. It retains the existing Python video-processing backend while introducing a redesigned frontend using React and Vite.

ClankSnap aims to simplify the video clipping workflow by allowing users to provide video sources, preview content, generate clips, manage generated videos and customize captions.

**Project Development Status:** The React + Vite frontend scaffold and redesigned interface are part of the project. The screenshots document the current frontend design. Not every visible button or feature should be assumed to have a completed backend integration.

---

## Frontend Design Preview

ClankSnap features a modern creator-focused dashboard with a light lavender background, white rounded cards, purple gradients and a persistent video preview panel.

### 1. Home Page

The Home Page provides the main interface for starting the video clipping process.

Visible interface elements include:

- Video URL input.
- Upload video option.
- Video quality selection.
- Get Preview button.
- Generate Clips button.
- AI Highlights.
- Smart Clipping.
- Auto Captions.
- Local Processing.
- Live 9:16 video preview.
- Caption style selection.

![ClankSnap Home Page](docs/screenshots/home-page.jpeg)

### 2. Library

The Library provides a card-based interface for viewing generated clips.

Visible interface elements include:

- Generated video previews.
- Clip titles.
- Video duration and date.
- MP4 download option.
- SRT subtitle download option.
- Edit Clip button.
- Delete control.
- Clip rating option.

![ClankSnap Library](docs/screenshots/library.jpeg)

### 3. Video Editor

The Editor provides a workspace for customizing generated clips.

Visible interface elements include:

- Clip selection panel.
- Vertical video preview.
- Caption customization.
- Caption style presets.
- Font size selection.
- Words per line.
- Font selection.
- Text colour customization.
- Active word colour.
- Text outline.
- Framing settings.
- Audio settings.
- Effects settings.

![ClankSnap Editor](docs/screenshots/editor.jpeg)

*Note: Screenshots represent the frontend design during development. They do not independently confirm that every displayed control is fully functional or connected to the backend.*

---

## Main Features

| Feature | Description |
|---|---|
| Video Input | Provide a supported video link or upload a local video. |
| AI-Assisted Clipping | Backend workflows for generating short clips from longer videos. |
| Automatic Captions | Speech transcription and subtitle generation using the existing processing stack. |
| Video Preview | Preview video content in a vertical 9:16 layout. |
| Clip Library | Browse and manage generated clips. |
| Caption Customization | Customize caption styles, fonts, sizes and colours in the editor interface. |
| Video Export | Export selected video clips using backend processing. |
| Local Processing | Uses locally available processing tools and models where configured. |
| Live Clipping | Existing backend includes live clipping routes. |

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- HTML5
- CSS3

### Backend

- Python
- FastAPI

### AI and Machine Learning

- Ollama
- Faster-Whisper
- OpenCV

### Video Processing

- FFmpeg
- yt-dlp
- Streamlink

### Development Tools

- Git
- GitHub
- Visual Studio Code
- Node.js
- npm

---

## Application Architecture

ClankSnap uses a frontend and backend architecture.

The React frontend provides the user interface, while the Python backend handles video-processing operations and API functionality.

```text
                  USER
                    |
                    |
                    v
          REACT + VITE FRONTEND
                frontend/
                    |
                    |
              API REQUESTS
          (Integration to verify)
                    |
                    v
             FASTAPI BACKEND
                app.py
                    |
                    |
          VIDEO PROCESSING SYSTEM
                    |
          +---------+---------+
          |         |         |
          v         v         v
        FFmpeg    yt-dlp   Streamlink
          |
          |
          v
       AI PROCESSING
          |
     +----+----------+
     |               |
     v               v
Faster-Whisper    OpenCV
     |
     v
Ollama (Local LLM)
     |
     v
Generated Clips
```

---

## Project Structure

The project contains the original Python backend in the repository root and the redesigned React frontend inside the `frontend` directory.

```text
Clanksnap/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── index.html
│
├── tests/
│
├── app.py
├── requirements.txt
├── run.ps1
├── install.ps1
├── install.sh
│
├── docs/
│   └── screenshots/
│       ├── home-page.jpeg
│       ├── library.jpeg
│       └── editor.jpeg
│
├── LICENSE
└── README.md
```

---

## Installation Requirements

Before installing ClankSnap, make sure you have:

- Windows 10 or Windows 11.
- Python compatible with the backend dependencies.
- Node.js.
- npm.
- Git.
- FFmpeg support.
- Ollama (optional, for local LLM functionality).

---

## Installation on Windows

### Step 1: Clone the Repository

Open PowerShell or the VS Code terminal.

```powershell
git clone https://github.com/Ashwanikumar6/Clanksnap.git
```

Navigate to the project directory:

```powershell
cd Clanksnap
```

For an existing local installation:

```powershell
cd C:\clanksnap\neonclipping
```

### Step 2: Set Up the Python Backend

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the required dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Run the Backend

Start the Python backend using:

```powershell
.\run.ps1
```

Alternatively, after installing the dependencies:

```powershell
python app.py
```

The inherited Windows launcher normally uses port 8770, or 8771 if that port is occupied.

Keep the backend terminal running.

### Step 4: Set Up the React Frontend

Open another terminal in VS Code.

Navigate to the frontend directory:

```powershell
cd C:\clanksnap\neonclipping\frontend
```

Install frontend dependencies:

```powershell
npm install
```

### Step 5: Run the Frontend

Start the Vite development server:

```powershell
npm run dev
```

Vite will display a local development URL in the terminal, commonly:

```text
http://localhost:5173
```

Open the displayed URL in your browser.

### Step 6: Build the Frontend

To create a production build:

```powershell
npm run build
```

To preview the production build:

```powershell
npm run preview
```

To run frontend linting:

```powershell
npm run lint
```

**Important:** Running the frontend and backend separately does not automatically guarantee API connectivity. The API URL, CORS settings and frontend request handling must be configured and tested.

---

## Backend API Overview

The existing FastAPI backend provides routes for video processing and clip management.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/make` | Start video clip generation. |
| GET | `/make/{job}` | Check clip-generation job status. |
| POST | `/upload` | Upload a local video. |
| GET | `/library` | Retrieve saved clips. |
| POST | `/transcribe` | Start transcription. |
| POST | `/export` | Export a selected clip. |
| GET | `/media/{id}` | Access stored video files. |
| GET | `/text/{id}/{kind}` | Access subtitle files. |
| GET | `/layouts` | Retrieve available layout information. |
| POST | `/live/start` | Start a live clipping session. |
| GET | `/live/{lid}` | Check live session status. |
| POST | `/live/{lid}/clip-now` | Request a clip from a live session. |
| POST | `/live/{lid}/stop` | Stop a live session. |
| GET | `/readiness` | Check dependency readiness. |

These routes are based on the existing backend source. Refer to `app.py` and related modules for complete request and response details.

---

## Team Collaboration

ClankSnap is developed by a team of five contributors.

The team follows a collaborative development approach rather than assigning permanent responsibilities to individual members.

All contributors can participate in:

- Frontend development.
- Backend development.
- UI improvements.
- API integration.
- Testing and debugging.
- Documentation.
- Feature development.

### Git Collaboration Workflow

The team uses Git and GitHub to manage collaborative development.

Recommended workflow:

1. Pull the latest changes from the main branch.
2. Create a separate feature branch.
3. Make the required changes.
4. Test the changes locally.
5. Commit and push the changes.
6. Create a Pull Request.
7. Review and merge approved changes.

Example commands:

```bash
git checkout main
git pull origin main

git checkout -b feature/your-change

git add .
git commit -m "Describe your changes"

git push -u origin feature/your-change
```

Pull Requests help maintain code quality and reduce conflicts during team development.

---

## Future Improvements

Possible future development areas include:

- Complete React and FastAPI integration.
- Improve video preview functionality.
- Connect clip-generation controls to backend workflows.
- Improve clip library management.
- Complete editor and export integration.
- Improve caption customization.
- Add better loading and error messages.
- Improve application performance.
- Add more automated tests.
- Improve documentation and deployment.

These are planned improvement areas, not claims of completed functionality.

---

## Credits and Acknowledgements

ClankSnap is based on the original open-source **NeonClipping** project.

Original Project:

[NeonClipping by Ajay K Meena](https://github.com/iamajmeena/neonclipping)

We acknowledge the original project's development and the open-source technologies used in the video-processing pipeline.

Technologies acknowledged:

- React
- Vite
- Python
- FastAPI
- FFmpeg
- yt-dlp
- Streamlink
- Faster-Whisper
- OpenCV
- Ollama

The redesigned React + Vite frontend is maintained in the ClankSnap repository.

---

## License

The current ClankSnap repository contains an MIT `LICENSE` file with the original NeonClipping copyright notice. The original NeonClipping repository identifies its license as GNU Affero General Public License v3.0 (AGPL-3.0).

Since ClankSnap is derived from NeonClipping, upstream copyright notices and applicable license obligations must be preserved. The presence of an MIT license file in this repository does not by itself establish that all inherited code can be relicensed under MIT.

Please review both license files before distributing the project.

- [ClankSnap License](https://github.com/Ashwanikumar6/Clanksnap/blob/main/LICENSE)
- [Original NeonClipping License](https://github.com/iamajmeena/neonclipping/blob/main/LICENSE)

---

<div align="center">

### ClankSnap

**Built collaboratively with the goal of simplifying short-form video creation.**

[GitHub Repository](https://github.com/Ashwanikumar6/Clanksnap)

</div>
