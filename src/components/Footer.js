import React from 'react';

function Footer() {
  return (
    <footer className="bg-primary text-white mt-5 py-4">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12 text-center">
            <p className="mb-2">
              &copy; {new Date().getFullYear()} Johannes Kepler University Linz
            </p>
            <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
              <a 
                href="https://se.jku.at/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white text-decoration-none"
                style={{ textDecoration: 'underline' }}
              >
                <i className="fas fa-link me-1"></i>
                Department of Business Informatics – Software Engineering
              </a>
              <span className="text-white">|</span>
              <a 
                href="http://ifi.jku.at/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white text-decoration-none"
                style={{ textDecoration: 'underline' }}
              >
                <i className="fas fa-link me-1"></i>
                Institute of Innovation Management
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

