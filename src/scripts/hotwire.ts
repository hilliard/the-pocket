import * as Turbo from '@hotwired/turbo';
import { Application } from '@hotwired/stimulus';

// Initialize Stimulus application
const application = Application.start();

// Disable Turbo caching if needed, or customize setup
// Turbo.session.drive = true;

export { application, Turbo };
