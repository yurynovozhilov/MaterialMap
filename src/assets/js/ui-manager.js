/**
 * UI Manager - Manages the user interface for material editing
 */

class UIManager {
    constructor(materialEditor) {
        this.materialEditor = materialEditor;
        this.currentMode = 'view'; // 'view', 'edit', 'contribution'
        this.editModal = null;
        this.authModal = null;
        
        this.initializeUI();
    }

    initializeUI() {
        this.createEditModal();
        this.createAuthModal();
        this.setupEventListeners();
        // this.addEditButtons(); // Temporarily disabled to avoid conflicts
    }

    // Mode management
    showViewMode() {
        this.currentMode = 'view';
        this.hideEditModal();
        this.hideAuthModal();
        this.updateEditButtons();
    }

    showEditMode(material, changeSet) {
        this.currentMode = 'edit';
        this.populateEditForm(material, changeSet);
        this.showEditModal();
        this.updateValidationDisplay(changeSet.validation);
    }

    showContributionMode() {
        this.currentMode = 'contribution';
        this.showAuthModal();
    }

    // Modal creation and management
    createEditModal() {
        const modalHTML = `
            <div id="material-edit-modal" class="edit-modal" style="display: none;">
                <div class="edit-modal-content">
                    <div class="edit-modal-header">
                        <h2>Edit Material</h2>
                        <div class="edit-modal-controls">
                            <button id="edit-modal-minimize" class="btn-icon" title="Minimize">−</button>
                            <button id="edit-modal-close" class="btn-icon" title="Close">×</button>
                        </div>
                    </div>
                    
                    <div class="edit-modal-body">
                        <div class="edit-tabs">
                            <button class="edit-tab active" data-tab="basic">Basic Info</button>
                            <button class="edit-tab" data-tab="material">Material Data</button>
                            <button class="edit-tab" data-tab="metadata">Metadata</button>
                            <button class="edit-tab" data-tab="preview">Preview</button>
                            <button class="edit-tab" data-tab="diff">Changes</button>
                        </div>
                        
                        <div class="edit-content">
                            <!-- Basic Info Tab -->
                            <div class="edit-tab-content active" data-tab="basic">
                                <div class="form-group">
                                    <label for="edit-id">Material ID *</label>
                                    <input type="text" id="edit-id" class="form-control" data-field="id" required>
                                    <div class="field-validation" data-field="id"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-mat">Material Type *</label>
                                    <input type="text" id="edit-mat" class="form-control" data-field="mat" required>
                                    <div class="field-validation" data-field="mat"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-eos">EOS</label>
                                    <input type="text" id="edit-eos" class="form-control" data-field="eos">
                                    <div class="field-validation" data-field="eos"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-mat-add">Additional Material</label>
                                    <input type="text" id="edit-mat-add" class="form-control" data-field="mat_add">
                                    <div class="field-validation" data-field="mat_add"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-mat-thermal">Thermal Material</label>
                                    <input type="text" id="edit-mat-thermal" class="form-control" data-field="mat_thermal">
                                    <div class="field-validation" data-field="mat_thermal"></div>
                                </div>
                            </div>
                            
                            <!-- Material Data Tab -->
                            <div class="edit-tab-content" data-tab="material">
                                <div class="form-group">
                                    <label for="edit-mat-data">Material Data *</label>
                                    <textarea id="edit-mat-data" class="form-control code-editor" data-field="mat_data" rows="15" required></textarea>
                                    <div class="field-validation" data-field="mat_data"></div>
                                    <div class="editor-help">
                                        <small>LS-DYNA format. Lines should not exceed 80 characters.</small>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-eos-data">EOS Data</label>
                                    <textarea id="edit-eos-data" class="form-control code-editor" data-field="eos_data" rows="8"></textarea>
                                    <div class="field-validation" data-field="eos_data"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-mat-add-data">Additional Material Data</label>
                                    <textarea id="edit-mat-add-data" class="form-control code-editor" data-field="mat_add_data" rows="8"></textarea>
                                    <div class="field-validation" data-field="mat_add_data"></div>
                                </div>
                            </div>
                            
                            <!-- Metadata Tab -->
                            <div class="edit-tab-content" data-tab="metadata">
                                <div class="form-group">
                                    <label for="edit-applications">Applications *</label>
                                    <div id="edit-applications" class="applications-editor">
                                        <!-- Dynamic application inputs -->
                                    </div>
                                    <button type="button" id="add-application" class="btn btn-secondary">Add Application</button>
                                    <div class="field-validation" data-field="app"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-ref">Reference *</label>
                                    <textarea id="edit-ref" class="form-control" data-field="ref" rows="4" required></textarea>
                                    <div class="field-validation" data-field="ref"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-url">URL *</label>
                                    <input type="url" id="edit-url" class="form-control" data-field="url" required>
                                    <div class="field-validation" data-field="url"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-add">Date Added *</label>
                                    <input type="date" id="edit-add" class="form-control" data-field="add" required>
                                    <div class="field-validation" data-field="add"></div>
                                </div>
                            </div>
                            
                            <!-- Preview Tab -->
                            <div class="edit-tab-content" data-tab="preview">
                                <div class="preview-container">
                                    <h3>Material Preview</h3>
                                    <div id="material-preview" class="material-preview">
                                        <!-- Live preview content -->
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Changes Tab -->
                            <div class="edit-tab-content" data-tab="diff">
                                <div class="diff-container">
                                    <h3>Changes Summary</h3>
                                    <div id="changes-summary" class="changes-summary">
                                        <!-- Changes summary -->
                                    </div>
                                    <div id="changes-diff" class="changes-diff">
                                        <!-- Detailed diff -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-modal-footer">
                        <div class="validation-status" id="validation-status">
                            <span class="status-indicator"></span>
                            <span class="status-text">Validation pending...</span>
                        </div>
                        
                        <div class="modal-actions">
                            <button id="cancel-edit" class="btn btn-secondary">Cancel</button>
                            <button id="save-draft" class="btn btn-outline">Save Draft</button>
                            <button id="submit-changes" class="btn btn-primary">Submit Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.editModal = document.getElementById('material-edit-modal');
    }

    createAuthModal() {
        const modalHTML = `
            <div id="github-auth-modal" class="auth-modal" style="display: none;">
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <h2>GitHub Authentication</h2>
                        <button id="auth-modal-close" class="btn-icon">×</button>
                    </div>
                    
                    <div class="auth-modal-body">
                        <div class="auth-step" id="auth-step-1">
                            <h3>Connect to GitHub</h3>
                            <p>To submit material edits, you need to authenticate with GitHub. This allows the system to create pull requests on your behalf.</p>
                            
                            <div class="auth-options">
                                <div class="auth-option">
                                    <h4>GitHub OAuth Authentication</h4>
                                    <p>One-click authentication through GitHub OAuth</p>
                                    <button id="auth-with-oauth" class="btn btn-primary">Authenticate with GitHub</button>
                                </div>
                                
                                <div class="auth-divider">
                                    <span>or</span>
                                </div>
                                
                                <div class="auth-option">
                                    <h4>Personal Access Token</h4>
                                    <p>Use your GitHub Personal Access Token for authentication</p>
                                    <div class="pat-input-group">
                                        <input type="password" id="pat-token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" class="form-control">
                                        <button id="auth-with-pat" class="btn btn-secondary">Authenticate</button>
                                    </div>
                                    <small class="help-text">
                                        <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=MaterialMap%20Editor" target="_blank">
                                            Create a Personal Access Token
                                        </a> with 'public_repo' scope
                                    </small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="auth-step" id="auth-step-2" style="display: none;">
                            <div class="auth-success">
                                <h3>✅ Authentication Successful</h3>
                                <div id="user-info" class="user-info">
                                    <!-- User information will be populated here -->
                                </div>
                                <p>You can now submit material edits. Your changes will be submitted as pull requests to the repository.</p>
                            </div>
                        </div>
                        
                        <div class="auth-step" id="auth-step-error" style="display: none;">
                            <div class="auth-error">
                                <h3>❌ Authentication Failed</h3>
                                <div id="auth-error-message" class="error-message">
                                    <!-- Error message will be populated here -->
                                </div>
                                <button id="auth-retry" class="btn btn-primary">Try Again</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="auth-modal-footer">
                        <div class="auth-info">
                            <small>Your GitHub token is stored securely in your browser and is only used to create pull requests.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.authModal = document.getElementById('github-auth-modal');
    }

    // Event listeners setup
    setupEventListeners() {
        // Edit modal events
        document.getElementById('edit-modal-close')?.addEventListener('click', () => {
            this.materialEditor.cancelEdit();
        });

        document.getElementById('edit-modal-minimize')?.addEventListener('click', () => {
            this.toggleMinimizeModal();
        });

        // Tab switching
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form field changes
        document.querySelectorAll('.form-control[data-field]').forEach(field => {
            field.addEventListener('input', (e) => {
                this.handleFieldChange(e.target.dataset.field, e.target.value);
            });
        });

        // Application management
        document.getElementById('add-application')?.addEventListener('click', () => {
            this.addApplicationField();
        });

        // Modal actions
        document.getElementById('cancel-edit')?.addEventListener('click', () => {
            this.materialEditor.cancelEdit();
        });

        document.getElementById('save-draft')?.addEventListener('click', () => {
            this.saveDraft();
        });

        document.getElementById('submit-changes')?.addEventListener('click', () => {
            this.showSubmissionDialog();
        });

        // Auth modal events
        document.getElementById('auth-modal-close')?.addEventListener('click', () => {
            this.hideAuthModal();
        });

        document.getElementById('auth-with-oauth')?.addEventListener('click', () => {
            this.authenticateWithOAuth();
        });

        document.getElementById('auth-with-pat')?.addEventListener('click', () => {
            this.authenticateWithPAT();
        });

        // Allow Enter key in PAT input field
        document.getElementById('pat-token-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.authenticateWithPAT();
            }
        });

        document.getElementById('auth-retry')?.addEventListener('click', () => {
            this.showAuthStep('auth-step-1');
        });

        // Connection status
        this.updateConnectionStatus(navigator.onLine);
    }

    // Add edit buttons to material rows
    addEditButtons() {
        // Wait for DataTable to be initialized
        setTimeout(() => {
            const table = $('#materials-table').DataTable();
            if (table) {
                // Add edit button column if not exists
                this.addEditButtonColumn(table);
            }
        }, 1000);
    }

    addEditButtonColumn(table) {
        // Check if edit column already exists
        const columns = table.settings()[0].aoColumns;
        const hasEditColumn = columns.some(col => col.sTitle === 'Actions');
        
        if (!hasEditColumn) {
            // Add edit buttons to existing rows
            table.rows().every(function() {
                const rowNode = this.node();
                const rowData = this.data();
                
                if (rowData && rowData[4]) { // Material data is in column 4
                    const editButton = document.createElement('button');
                    editButton.className = 'btn btn-edit btn-sm';
                    editButton.innerHTML = '✏️ Edit';
                    editButton.title = 'Suggest edit for this material';
                    
                    editButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.startMaterialEdit(rowData[4], rowData);
                    });
                    
                    // Add button to the row
                    const actionsCell = document.createElement('td');
                    actionsCell.appendChild(editButton);
                    rowNode.appendChild(actionsCell);
                }
            });
        }
    }

    // Material editing workflow
    async startMaterialEdit(materialData, rowData) {
        try {
            // Check if user is authenticated
            if (!this.materialEditor.githubIntegration.isAuthenticated()) {
                this.showContributionMode();
                return;
            }

            // Extract material information
            const filename = this.extractFilename(rowData);
            const index = this.extractMaterialIndex(rowData);
            const materialId = this.materialEditor.generateMaterialId(filename, index);

            // Start edit session
            await this.materialEditor.startEditSession(materialId, materialData, filename, index);
            
        } catch (error) {
            this.showError(`Failed to start editing: ${error.message}`);
        }
    }

    extractFilename(rowData) {
        // This would need to be implemented based on how the data is structured
        // For now, return a placeholder
        return 'unknown.yaml';
    }

    extractMaterialIndex(rowData) {
        // This would need to be implemented based on how the data is structured
        // For now, return 0
        return 0;
    }

    // Form population and management
    populateEditForm(material, changeSet) {
        // Populate basic info
        this.setFieldValue('id', material.id || '');
        this.setFieldValue('mat', material.mat || '');
        this.setFieldValue('eos', material.eos || '');
        this.setFieldValue('mat_add', material.mat_add || '');
        this.setFieldValue('mat_thermal', material.mat_thermal || '');

        // Populate material data
        this.setFieldValue('mat_data', material.mat_data || '');
        this.setFieldValue('eos_data', material.eos_data || '');
        this.setFieldValue('mat_add_data', material.mat_add_data || '');

        // Populate metadata
        this.populateApplications(material.app || []);
        this.setFieldValue('ref', material.ref || '');
        this.setFieldValue('url', material.url || '');
        this.setFieldValue('add', material.add || '');

        // Update preview and diff
        this.updatePreview(material);
        this.updateDiff(changeSet.changes.fields);
    }

    setFieldValue(fieldName, value) {
        const field = document.querySelector(`[data-field="${fieldName}"]`);
        if (field) {
            field.value = value;
        }
    }

    populateApplications(applications) {
        const container = document.getElementById('edit-applications');
        container.innerHTML = '';

        applications.forEach((app, index) => {
            this.addApplicationField(app, index);
        });

        // Add empty field if no applications
        if (applications.length === 0) {
            this.addApplicationField('', 0);
        }
    }

    addApplicationField(value = '', index = null) {
        const container = document.getElementById('edit-applications');
        const actualIndex = index !== null ? index : container.children.length;
        
        const fieldHTML = `
            <div class="application-field" data-index="${actualIndex}">
                <input type="text" class="form-control" data-field="app[${actualIndex}]" value="${escapeHtml(value)}" placeholder="Application description">
                <button type="button" class="btn btn-remove" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', fieldHTML);
        
        // Add event listener to new field
        const newField = container.lastElementChild.querySelector('input');
        newField.addEventListener('input', (e) => {
            this.handleFieldChange(e.target.dataset.field, e.target.value);
        });
    }

    handleFieldChange(fieldPath, value) {
        // Update material data through the editor
        this.materialEditor.updateMaterial(fieldPath, value);
    }

    // UI updates
    updatePreview(material) {
        const previewContainer = document.getElementById('material-preview');
        if (!previewContainer) return;

        const previewHTML = `
            <div class="material-card">
                <div class="material-header">
                    <h4>${escapeHtml(material.id || 'N/A')} / ${escapeHtml(material.mat || 'N/A')}</h4>
                    ${material.eos ? `<span class="eos-badge">${escapeHtml(material.eos)}</span>` : ''}
                </div>
                
                <div class="material-body">
                    ${material.app && material.app.length > 0 ? `
                        <div class="applications">
                            <strong>Applications:</strong>
                            <ul>
                                ${material.app.map(app => `<li>${escapeHtml(app)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${material.mat_data ? `
                        <div class="material-data">
                            <strong>Material Data:</strong>
                            <pre><code>${escapeHtml(material.mat_data)}</code></pre>
                        </div>
                    ` : ''}
                    
                    <div class="material-meta">
                        <p><strong>Reference:</strong> ${escapeHtml(material.ref || 'N/A')}</p>
                        ${material.url ? `<p><strong>URL:</strong> <a href="${escapeHtml(material.url)}" target="_blank">${escapeHtml(material.url)}</a></p>` : ''}
                        <p><strong>Added:</strong> ${escapeHtml(material.add || 'N/A')}</p>
                    </div>
                </div>
            </div>
        `;
        
        previewContainer.innerHTML = previewHTML;
    }

    updateDiff(changes) {
        const summaryContainer = document.getElementById('changes-summary');
        const diffContainer = document.getElementById('changes-diff');
        
        if (!summaryContainer || !diffContainer) return;

        // Update summary
        if (changes.length === 0) {
            summaryContainer.innerHTML = '<p class="no-changes">No changes made yet.</p>';
            diffContainer.innerHTML = '';
            return;
        }

        const summary = {
            total: changes.length,
            add: changes.filter(c => c.operation === 'ADD').length,
            update: changes.filter(c => c.operation === 'UPDATE').length,
            delete: changes.filter(c => c.operation === 'DELETE').length
        };

        summaryContainer.innerHTML = `
            <div class="changes-stats">
                <span class="stat">Total: ${summary.total}</span>
                ${summary.add > 0 ? `<span class="stat add">+${summary.add}</span>` : ''}
                ${summary.update > 0 ? `<span class="stat update">~${summary.update}</span>` : ''}
                ${summary.delete > 0 ? `<span class="stat delete">-${summary.delete}</span>` : ''}
            </div>
        `;

        // Update detailed diff
        const diffHTML = changes.map(change => `
            <div class="diff-item ${change.operation.toLowerCase()}">
                <div class="diff-header">
                    <span class="field-path">${escapeHtml(change.fieldPath)}</span>
                    <span class="operation ${change.operation.toLowerCase()}">${change.operation}</span>
                    <span class="confidence">Confidence: ${Math.round(change.confidence * 100)}%</span>
                </div>
                <div class="diff-content">
                    ${change.operation === 'UPDATE' ? `
                        <div class="diff-old">- ${escapeHtml(this.formatValue(change.oldValue))}</div>
                        <div class="diff-new">+ ${escapeHtml(this.formatValue(change.newValue))}</div>
                    ` : change.operation === 'ADD' ? `
                        <div class="diff-new">+ ${escapeHtml(this.formatValue(change.newValue))}</div>
                    ` : `
                        <div class="diff-old">- ${escapeHtml(this.formatValue(change.oldValue))}</div>
                    `}
                </div>
            </div>
        `).join('');

        diffContainer.innerHTML = diffHTML;
    }

    formatValue(value) {
        if (typeof value === 'string' && value.length > 100) {
            return value.substring(0, 100) + '...';
        }
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    updateValidation(validation) {
        const statusContainer = document.getElementById('validation-status');
        if (!statusContainer) return;

        const indicator = statusContainer.querySelector('.status-indicator');
        const text = statusContainer.querySelector('.status-text');

        // Update status indicator
        indicator.className = `status-indicator ${validation.status.toLowerCase()}`;
        
        // Update status text
        if (validation.status === 'VALID') {
            text.textContent = 'All validation checks passed';
        } else if (validation.status === 'WARNING') {
            text.textContent = `${validation.warnings.length} warning(s)`;
        } else {
            text.textContent = `${validation.errors.length} error(s)`;
        }

        // Update field-specific validation
        this.updateFieldValidation(validation);
        
        // Update submit button state
        const submitButton = document.getElementById('submit-changes');
        if (submitButton) {
            submitButton.disabled = validation.status === 'INVALID';
        }
    }

    updateFieldValidation(validation) {
        // Clear all field validation
        document.querySelectorAll('.field-validation').forEach(el => {
            el.innerHTML = '';
            el.className = 'field-validation';
        });

        // Add errors
        validation.errors.forEach(error => {
            const fieldValidation = document.querySelector(`[data-field="${error.field}"]`);
            if (fieldValidation) {
                const parent = fieldValidation.parentElement;
                const validationDiv = parent.querySelector('.field-validation');
                if (validationDiv) {
                    validationDiv.innerHTML += `<div class="validation-error">${escapeHtml(error.message)}</div>`;
                    validationDiv.classList.add('has-error');
                }
            }
        });

        // Add warnings
        validation.warnings.forEach(warning => {
            const fieldValidation = document.querySelector(`[data-field="${warning.field}"]`);
            if (fieldValidation) {
                const parent = fieldValidation.parentElement;
                const validationDiv = parent.querySelector('.field-validation');
                if (validationDiv) {
                    validationDiv.innerHTML += `<div class="validation-warning">${escapeHtml(warning.message)}</div>`;
                    validationDiv.classList.add('has-warning');
                }
            }
        });
    }

    // Modal management
    showEditModal() {
        if (this.editModal) {
            this.editModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }

    hideEditModal() {
        if (this.editModal) {
            this.editModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    showAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // Check if already authenticated
            if (this.materialEditor.githubIntegration.isAuthenticated()) {
                this.showAuthStep('auth-step-2');
                this.populateUserInfo();
            } else {
                this.showAuthStep('auth-step-1');
            }
        }
    }

    hideAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    toggleMinimizeModal() {
        if (this.editModal) {
            this.editModal.classList.toggle('minimized');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.edit-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
    }

    // Authentication UI
    showAuthStep(stepId) {
        document.querySelectorAll('.auth-step').forEach(step => {
            step.style.display = step.id === stepId ? 'block' : 'none';
        });
    }

    async authenticateWithOAuth() {
        try {
            // Show loading state
            const oauthButton = document.getElementById('auth-with-oauth');
            const originalText = oauthButton.textContent;
            oauthButton.disabled = true;
            oauthButton.textContent = 'Opening GitHub...';

            const user = await this.materialEditor.githubIntegration.authenticateWithOAuth();
            this.showAuthStep('auth-step-2');
            this.populateUserInfo(user);
            
        } catch (error) {
            this.showAuthError(error.message);
        } finally {
            // Restore button state
            const oauthButton = document.getElementById('auth-with-oauth');
            if (oauthButton) {
                oauthButton.disabled = false;
                oauthButton.textContent = 'Authenticate with GitHub';
            }
        }
    }

    async authenticateWithPAT() {
        try {
            // Get token from input
            const tokenInput = document.getElementById('pat-token-input');
            const token = tokenInput.value.trim();
            
            if (!token) {
                this.showAuthError('Please enter your Personal Access Token');
                return;
            }
            
            // Validate token format (GitHub PAT format)
            if (!token.match(/^gh[ps]_[A-Za-z0-9_]{36,255}$/)) {
                this.showAuthError('Invalid token format. Please enter a valid GitHub Personal Access Token (starts with ghp_ or ghs_)');
                return;
            }
            
            // Show loading state
            const patButton = document.getElementById('auth-with-pat');
            const originalText = patButton.textContent;
            patButton.disabled = true;
            patButton.textContent = 'Authenticating...';
            
            // Disable input
            tokenInput.disabled = true;

            const user = await this.materialEditor.githubIntegration.authenticateWithToken(token);
            
            // Clear the input for security
            tokenInput.value = '';
            
            this.showAuthStep('auth-step-2');
            this.populateUserInfo(user);
            
        } catch (error) {
            this.showAuthError(error.message);
        } finally {
            // Restore button and input state
            const patButton = document.getElementById('auth-with-pat');
            const tokenInput = document.getElementById('pat-token-input');
            
            if (patButton) {
                patButton.disabled = false;
                patButton.textContent = 'Authenticate';
            }
            
            if (tokenInput) {
                tokenInput.disabled = false;
            }
        }
    }

    populateUserInfo(user = null) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) return;

        const currentUser = user || this.materialEditor.githubIntegration.user;
        if (!currentUser) return;

        userInfo.innerHTML = `
            <div class="user-profile">
                <img src="${currentUser.avatar_url}" alt="Avatar" class="user-avatar">
                <div class="user-details">
                    <h4>${escapeHtml(currentUser.name || currentUser.login)}</h4>
                    <p>@${escapeHtml(currentUser.login)}</p>
                    ${currentUser.email ? `<p>${escapeHtml(currentUser.email)}</p>` : ''}
                </div>
            </div>
        `;
    }

    showAuthError(message) {
        const errorMessage = document.getElementById('auth-error-message');
        if (errorMessage) {
            // Check if this is an OAuth backend issue
            if (message.includes('OAuth token exchange requires a backend service')) {
                errorMessage.innerHTML = `
                    <p><strong>OAuth Authentication Not Available</strong></p>
                    <p>This static site doesn't have a backend service configured for OAuth token exchange.</p>
                    <p><strong>Alternative: Use Personal Access Token</strong></p>
                    <ol>
                        <li>Go to <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=MaterialMap%20Editor" target="_blank">GitHub Settings → Personal Access Tokens</a></li>
                        <li>Create a new token with <code>public_repo</code> scope</li>
                        <li>Copy the token and use it in the "Personal Access Token" section above</li>
                    </ol>
                    <p><em>Personal Access Tokens work just as well as OAuth for this application.</em></p>
                `;
            } else if (message.includes('development mode configuration')) {
                const isLocalhost = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' ||
                                  window.location.hostname.includes('127.0.0.1');
                
                if (isLocalhost) {
                    errorMessage.innerHTML = `
                        <p><strong>Development Mode Configuration Issue</strong></p>
                        <p>${message}</p>
                        <p><strong>To fix this:</strong></p>
                        <ol>
                            <li>Open <code>assets/js/config.js</code></li>
                            <li>Ensure <code>development.enabled</code> is <code>true</code></li>
                            <li>Ensure <code>development.mockOAuth</code> is <code>true</code></li>
                            <li>Refresh the page</li>
                        </ol>
                        <p>Alternatively, use a Personal Access Token instead.</p>
                    `;
                } else {
                    errorMessage.innerHTML = `
                        <p><strong>Authentication Error</strong></p>
                        <p>${message}</p>
                        <p><strong>Try using a Personal Access Token instead:</strong></p>
                        <ol>
                            <li>Create a token at <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=MaterialMap%20Editor" target="_blank">GitHub Settings</a></li>
                            <li>Use the "Personal Access Token" option above</li>
                        </ol>
                    `;
                }
            } else {
                // For other errors, show the message as-is but suggest PAT as alternative
                errorMessage.innerHTML = `
                    <p><strong>Authentication Error</strong></p>
                    <p>${escapeHtml(message)}</p>
                    <p><strong>Alternative:</strong> Try using a Personal Access Token instead of OAuth.</p>
                `;
            }
        }
        this.showAuthStep('auth-step-error');
    }

    // Submission workflow
    showSubmissionDialog() {
        const description = prompt('Please describe your changes:');
        if (description !== null) {
            this.submitChanges(description);
        }
    }

    async submitChanges(description) {
        try {
            this.showSubmissionProgress();
            const prUrl = await this.materialEditor.submitChanges(description);
            this.showSubmissionSuccess(prUrl);
        } catch (error) {
            this.showSubmissionError(error.message);
        }
    }

    showSubmissionProgress() {
        // Show progress indicator
        const submitButton = document.getElementById('submit-changes');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '⏳ Submitting...';
        }
    }

    showSubmissionSuccess(prUrl) {
        alert(`Changes submitted successfully! Pull request created: ${prUrl}`);
        this.hideEditModal();
        
        // Reset submit button
        const submitButton = document.getElementById('submit-changes');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Changes';
        }
    }

    showSubmissionError(message) {
        alert(`Submission failed: ${message}`);
        
        // Reset submit button
        const submitButton = document.getElementById('submit-changes');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Changes';
        }
    }

    // Utility methods
    saveDraft() {
        // Draft is automatically saved in session storage
        this.showMessage('Draft saved locally');
    }

    showMessage(message, type = 'info') {
        // Simple message display - could be enhanced with a toast system
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    showError(message) {
        this.showMessage(message, 'error');
        alert(`Error: ${message}`);
    }

    updateConnectionStatus(isOnline) {
        // Update UI based on connection status
        const statusIndicator = document.querySelector('.connection-status');
        if (statusIndicator) {
            statusIndicator.textContent = isOnline ? 'Online' : 'Offline';
            statusIndicator.className = `connection-status ${isOnline ? 'online' : 'offline'}`;
        }
    }

    updateEditButtons() {
        const editButtons = document.querySelectorAll('.btn-edit');
        const isAuthenticated = this.materialEditor.githubIntegration.isAuthenticated();
        
        editButtons.forEach(button => {
            button.textContent = isAuthenticated ? '✏️ Edit' : '✏️ Suggest Edit';
            button.title = isAuthenticated ? 'Edit this material' : 'Suggest edit for this material (requires GitHub authentication)';
        });
    }
}

// Utility function for HTML escaping
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// Export for use in other modules
window.UIManager = UIManager;