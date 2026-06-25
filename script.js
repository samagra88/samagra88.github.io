// Function to handle tab switching
function openTab(evt, tabName) {
    // 1. Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 2. Deactivate all buttons
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the target tab and activate the button
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// Function to handle Mermaid diagram clicks
// Add this line to explicitly make it accessible to Mermaid
window.showDetails = function(toolName) {
    const infoPanel = document.getElementById('info-panel');
    const data = {
        'Router': '<strong>LLM Router:</strong> The traffic controller. It checks API status and dynamically routes prompts to Gemini, Claude, or Groq to ensure 99.9% uptime.',
        'Validator': '<strong>Pydantic Validator:</strong> Enforces schema integrity. It acts as a gatekeeper, ensuring LLM outputs are clean, structured, and ready for processing.',
        'Drafter': '<strong>Drafter Agent:</strong> Orchestrated via CrewAI. It handles the actual content generation, utilizing chain-of-thought prompting for higher accuracy.'
    };
    infoPanel.innerHTML = data[toolName] || 'Details coming soon...';
};