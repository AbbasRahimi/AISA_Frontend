# Literature Search Auto Validation - React Frontend

A modern React.js frontend for the Literature Search Auto Validation API, providing an intuitive interface for automated literature review workflows.

## Features

- **Seed Paper Management**: Upload and manage BibTeX files for seed papers
- **Ground Truth References**: Add and manage reference datasets for validation
- **Prompt Management**: Upload and select prompts for LLM interactions
- **LLM Configuration**: Support for ChatGPT and Gemini models
- **Workflow Execution**: Execute complete literature search workflows
- **Real-time Progress**: Monitor workflow execution with live updates
- **Results Visualization**: View LLM responses, verification results, and comparisons
- **Export Functionality**: Export results in JSON and BibTeX formats

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **Bootstrap 5**: Responsive UI framework
- **Font Awesome**: Icon library
- **CSS3**: Custom styling with gradients and animations

## Getting Started

### Prerequisites

- Node.js (v14 or higher) - for local development
- Docker & Docker Compose - for containerized deployment
- Backend API running on `http://127.0.0.1:8001`

### Quick Start with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd AISA_Frontend
```

2. Start with Docker Compose:
```bash
npm run docker:prod
```

3. Access the application at `http://localhost:3000`

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

### Building for Production

#### Local Build
```bash
npm run build
```

#### Docker Build
```bash
npm run docker:build
```

This creates an optimized production build in the `build` folder or Docker image.

## API Integration

The frontend integrates with the following API endpoints:

### Core Endpoints
- `GET /api/seed-papers` - Retrieve available seed papers
- `POST /api/seed-papers` - Upload new seed paper (BibTeX)
- `GET /api/prompts` - Retrieve available prompts
- `POST /api/prompts` - Upload new prompt (text file)
- `GET /api/llm-models` - Get available LLM models

### Ground Truth Management
- `GET /api/seed-papers/{id}/ground-truth` - Get ground truth references
- `POST /api/seed-papers/{id}/ground-truth` - Upload ground truth references
- `DELETE /api/ground-truth/{id}` - Delete ground truth reference

### Workflow Execution
- `POST /api/workflow/execute` - Execute literature search workflow
- `GET /api/workflow/{id}/status` - Get execution status
- `GET /api/workflow/{id}/results` - Get execution results
- `GET /api/workflow/{id}/export` - Export results

## Project Structure

```
src/
├── components/
│   ├── ConfigurationPanel.js    # Main configuration interface
│   ├── ProgressPanel.js         # Workflow progress monitoring
│   ├── ResultsPanel.js         # Results visualization
│   └── FileUploadModal.js      # File upload modals
├── services/
│   └── api.js                  # API service layer
├── App.js                      # Main application component
├── App.css                     # Global styles
└── index.js                    # Application entry point
```

## Usage Guide

### 1. Configuration Setup
- Enter your email address (required for OpenAlex API access)
- Select or upload a seed paper (BibTeX format)
- Add ground truth references for validation
- Select or upload a prompt for LLM interaction
- Choose LLM provider (ChatGPT/Gemini) and model

### 2. Workflow Execution
- Click "Execute Workflow" to start the literature search process
- Monitor progress in real-time with the progress panel
- View detailed results in the results panel

### 3. Results Analysis
- **LLM Response**: View the raw LLM output
- **Verification**: See reference validation results
- **Comparison**: Compare generated references with ground truth

### 4. Export Results
- Export results in JSON format for further analysis
- Export in BibTeX format for bibliography management

## File Upload Support

### Supported File Types
- **Seed Papers**: `.bib` (BibTeX format)
- **Ground Truth**: `.bib`, `.json` (BibTeX or JSON format)
- **Prompts**: `.txt` (Plain text format)

### File Validation
- File type validation based on upload category
- File size display and validation
- Error handling for invalid files

## Styling and UI

The application features a modern, responsive design with:
- Gradient backgrounds and glass-morphism effects
- Smooth animations and transitions
- Responsive layout for mobile and desktop
- Bootstrap 5 components with custom styling
- Font Awesome icons throughout the interface

## Error Handling

Comprehensive error handling includes:
- API connection errors
- File upload validation
- Workflow execution failures
- Network timeout handling
- User-friendly error messages

## Docker Deployment

The application is fully dockerized for easy deployment and scaling.

### Docker Commands

- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:dev` - Start development environment
- `npm run docker:prod` - Start production environment
- `npm run docker:stop` - Stop all containers
- `npm run docker:logs` - View container logs

### Quick Docker Start

```bash
# Production deployment
npm run docker:prod

# Development deployment  
npm run docker:dev
```

For detailed Docker instructions, see [DOCKER.md](DOCKER.md).

## Development

### Available Scripts

- `npm start` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### Code Style

The project follows React best practices:
- Functional components with hooks
- Proper state management
- Component separation of concerns
- Consistent naming conventions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please refer to the API documentation at `http://127.0.0.1:8001/api/docs`.