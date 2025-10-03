
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        if (modalCadastroId) {
            const modalCadastroEl = document.getElementById(modalCadastroId);
            if (modalCadastroEl) {
                this.modalCadastro = new bootstrap.Modal(modalCadastroEl);
                this.modalCadastroTitleEl = modalCadastroEl.querySelector('.modal-title');
            }
        }

        if (modalEdicaoId) {
            const modalEdicaoEl = document.getElementById(modalEdicaoId);
            if (modalEdicaoEl) {
                this.modalEdicao = new bootstrap.Modal(modalEdicaoEl);
                this.modalEdicaoTitleEl = modalEdicaoEl.querySelector('.modal-title');
            }
        }
    }

    /**
     * Remove focus from elements inside a modal before closing
     * This prevents the aria-hidden warning
     */
    static removeFocusFromModal(modalElement) {
        const focusedElement = modalElement.querySelector(':focus');
        if (focusedElement) {
            focusedElement.blur();
        }
        // Move focus to body to ensure it's not trapped
        document.body.focus();
    }

    /**
     * Safely hide a modal by removing focus first
     */
    static safeHideModal(modalId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            // Remove focus from any element inside the modal
            ModalManager.removeFocusFromModal(modalEl);
            
            // Get or create Bootstrap modal instance
            let modal = bootstrap.Modal.getInstance(modalEl);
            if (!modal) {
                modal = new bootstrap.Modal(modalEl);
            }
            
            // Hide the modal
            modal.hide();
        }
    }

    setTitle(title) {
        if (this.modalCadastroTitleEl) {
            this.modalCadastroTitleEl.innerHTML = title;
        } else if (this.modalEdicaoTitleEl) {
            this.modalEdicaoTitleEl.innerHTML = title;
        }
    }

    show(modalId) { 
        // If modalId is provided, show that specific modal
        if (modalId) {
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        } else {
            // Default behavior: show cadastro modal
            this.abrirModalCadastro();
        }
    }

    hide(modalId) { 
        // If modalId is provided, hide that specific modal
        if (modalId) {
            ModalManager.safeHideModal(modalId);
        } else {
            // Default behavior: hide cadastro modal
            this.fecharModalCadastro();
        }
    }

    abrirModalCadastro() {
        if (this.modalCadastro) {
            this.modalCadastro.show();
        }
    }

    fecharModalCadastro() {
        if (this.modalCadastro) {
            const modalEl = this.modalCadastro._element;
            if (modalEl) {
                ModalManager.removeFocusFromModal(modalEl);
            }
            this.modalCadastro.hide();
        }
    }

    abrirModalEdicao() {
        if (this.modalEdicao) {
            this.modalEdicao.show();
        }
    }

    fecharModalEdicao() {
        if (this.modalEdicao) {
            const modalEl = this.modalEdicao._element;
            if (modalEl) {
                ModalManager.removeFocusFromModal(modalEl);
            }
            this.modalEdicao.hide();
        }
    }
}

