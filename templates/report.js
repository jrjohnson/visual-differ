class Modal {
  constructor(modalText) {
    this.modalDelay = 1500;
    this.modalText = modalText;
    this.parent = document.getElementById('lightbox');

    this.modal = null;
    this._createModal();

    let modal = this;
    setTimeout(
      function (modal) {
        modal._destroyModal(false);
      }.bind(this, modal),
      this.modalDelay,
    );
  }

  _createModal() {
    this.modal = document.createElement('dialog');
    this.modal.id = 'modal-window';

    const text = document.createElement('div');
    text.classList.add('modal-text');
    text.innerHTML = this.modalText;
    this.modal.appendChild(text);

    this.parent.appendChild(this.modal);

    setTimeout(() => this.modal.classList.add('load'), 1);
  }

  _destroyModal(immediate = false) {
    if (this.modal) {
      const modal = document.getElementById('modal-window');

      if (this.parent.contains(modal)) {
        // remove modal immediately
        if (immediate) {
          this.parent.removeChild(modal);
          delete this;
        }
        // fade out modal gently
        else {
          this.modal.classList.remove('load');
          this.modal.classList.add('remove');

          this.modal.addEventListener('transitionend', () => {
            this.parent.removeChild(modal);
            delete this;
          });
        }
      }
    }
  }
}

(() => {
  const lightbox = document.querySelector('#lightbox');
  const filename = lightbox.querySelector('.lightbox-image-filename');
  const image = lightbox.querySelector('.lightbox-image');
  const caption = lightbox.querySelector('.lightbox-caption');
  const imageCounter = lightbox.querySelector('.lightbox-image-counter');
  const rowCounter = lightbox.querySelector('.lightbox-row-counter');
  const link = lightbox.querySelector('.lightbox-link');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  // 2D grid: each row is a group of related images, columns are images within it.
  // Diff rows come first and are the only rows that participate in row counting and
  // Up/Down cycling; added-image rows can still be opened but don't have peers to cycle through.
  const toGroups = (groups) =>
    [...document.querySelectorAll(groups)].map((group) => [
      ...group.querySelectorAll('.lightbox-trigger'),
    ]);

  const diffGroups = toGroups('.diff-images[data-lightbox-group="diff"]');
  const addedGroups = toGroups('.diff-images[data-lightbox-group="added"]');
  const grid = [...diffGroups, ...addedGroups];
  const diffRowCount = diffGroups.length;

  if (grid.length === 0) return;

  let row = 0;
  let col = 0;

  const wrapCol = (r, c) => ((c % grid[r].length) + grid[r].length) % grid[r].length;

  const wrapRow = (r) => ((r % diffRowCount) + diffRowCount) % diffRowCount;

  const isDiffRow = (r) => r < diffRowCount;

  const show = (r, c) => {
    row = r;
    col = c;

    const img = grid[row][col].querySelector('img');

    filename.textContent = img.alt.split(' ').reverse()[0];
    image.src = img.src;
    image.alt = img.alt;
    caption.textContent = img.alt;
    imageCounter.textContent = `Image ${col + 1}\u2009/\u2009${grid[row].length}`;
    rowCounter.textContent = isDiffRow(row) ? `Row ${row + 1}\u2009/\u2009${diffRowCount}` : '';
    link.href = img.src;
  };

  const open = (r, c) => {
    show(r, c);
    lightbox.showModal();
  };

  for (const [r, group] of grid.entries()) {
    for (const [c, trigger] of group.entries()) {
      trigger.addEventListener('click', () => open(r, c));
    }
  }

  prevBtn.addEventListener('click', () => show(row, wrapCol(row, col - 1)));

  nextBtn.addEventListener('click', () => show(row, wrapCol(row, col + 1)));

  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());

  lightbox.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        show(row, wrapCol(row, col - 1));
        break;

      case 'ArrowRight':
        event.preventDefault();
        show(row, wrapCol(row, col + 1));
        break;

      case 'ArrowUp': {
        if (!isDiffRow(row)) break;

        event.preventDefault();

        const upRow = wrapRow(row - 1);
        show(upRow, Math.min(col, grid[upRow].length - 1));

        if (upRow === diffRowCount - 1) {
          if (window.tempModal) {
            window.tempModal._destroyModal();
          }

          window.tempModal = new Modal('Wrapped to bottom');
        }

        break;
      }

      case 'ArrowDown': {
        if (!isDiffRow(row)) break;

        event.preventDefault();

        const downRow = wrapRow(row + 1);
        show(downRow, Math.min(col, grid[downRow].length - 1));

        if (downRow == 0) {
          if (window.tempModal) {
            window.tempModal._destroyModal();
          }

          window.tempModal = new Modal('Wrapped to top');
        }

        break;
      }
    }
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      lightbox.close();
    }
  });
})();
