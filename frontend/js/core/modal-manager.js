
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        if (modalCadastroId) {
            const modalCadastroEl = document.getElementById(modalCadastroId);
            if (modalCadastroEl) {
                this.modalCadastro = new bootstrap.Modal(modalCadastroEl);
                this.modalCadastroTitleEl = modalCadastroEl.querySelector('.modal-title'); // Store title element
            } else {
            }
        }

        if (modalEdicaoId) {
            const modalEdicaoEl = document.getElementById(modalEdicaoId);
            if (modalEdicaoEl) {
                this.modalEdicao = new bootstrap.Modal(modalEdicaoEl);
                this.modalEdicaoTitleEl = modalEdicaoEl.querySelector('.modal-title'); // Store title element
            } else {
            }
        }
    }

    setTitle(title) {
        if (this.modalCadastroTitleEl) { // Assuming setTitle is for the cadastro modal
            this.modalCadastroTitleEl.innerHTML = title;
        } else if (this.modalEdicaoTitleEl) { // Fallback for edit modal if cadastro not present
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
            } else {
            }
        } else {
            // Default behavior: show cadastro modal
            this.abrirModalCadastro();
        }
    }

    hide(modalId) { 
        // If modalId is provided, hide that specific modal
        if (modalId) {
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) {
                    modal.hide();
                }
            } else {
            }
        } else {
            // Default behavior: hide cadastro modal
            this.fecharModalCadastro();
        }
    }

    abrirModalCadastro() {
        if (this.modalCadastro) {
            // Note: a limpeza do formulário deve ser feita no módulo específico
            this.modalCadastro.show();
        }
    }

    fecharModalCadastro() {
        if (this.modalCadastro) {
            this.modalCadastro.hide();
        } else {
        }
    }

    abrirModalEdicao() {
        if (this.modalEdicao) {
            this.modalEdicao.show();
        }
    }

    fecharModalEdicao() {
        if (this.modalEdicao) {
            this.modalEdicao.hide();
        }
    }
}
