document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.tab-section');
  const editableBlocks = document.querySelectorAll('.editable-text');
  const videoLinks = document.querySelectorAll('.video-link[data-video-key]');
  const saveAllBtn = document.getElementById('saveAllBtn');

  let isEditMode = false;
  let contentData = {};

  // Tab navigation
  navLinks.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      navLinks.forEach(b => b.classList.toggle('active', b === btn));
      sections.forEach(sec => {
        sec.classList.toggle('active', sec.dataset.tab === target);
      });
    });
  });

  // Load content from backend
  fetch('/api/content')
    .then(res => res.ok ? res.json() : {})
    .then(data => {
      contentData = data || {};
      applyContent();
    })
    .catch(() => {
      contentData = {};
    });

  function applyContent() {
    // Text blocks
    editableBlocks.forEach(block => {
      const key = block.dataset.key;
      if (key && contentData[key]) {
        block.innerHTML = contentData[key];
      }
    });

    // Video links (URLs)
    videoLinks.forEach(link => {
      const key = link.dataset.videoKey;
      if (key && contentData[key]) {
        link.href = contentData[key];
      }
    });
  }

  // Toggle edit mode with Ctrl+E
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      isEditMode = !isEditMode;
      document.body.classList.toggle('editing', isEditMode);
      setEditable(isEditMode);
    }
  });

  function setEditable(on) {
    editableBlocks.forEach(block => {
      block.contentEditable = on ? 'true' : 'false';
    });
    if (!on) {
      window.getSelection().removeAllRanges();
    }
  }

  // Save all content (text + video URLs)
  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', () => {
      // collect text content
      editableBlocks.forEach(block => {
        const key = block.dataset.key;
        if (key) {
          contentData[key] = block.innerHTML;
        }
      });
      // collect video URLs from link hrefs
      videoLinks.forEach(link => {
        const key = link.dataset.videoKey;
        if (key) {
          contentData[key] = link.href;
        }
      });

      fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentData)
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save');
        return res.json();
      })
      .then(() => {
        saveAllBtn.textContent = 'Saved ✓';
        setTimeout(() => {
          saveAllBtn.textContent = 'Save all changes';
        }, 1500);
      })
      .catch(() => {
        saveAllBtn.textContent = 'Error – try again';
        setTimeout(() => {
          saveAllBtn.textContent = 'Save all changes';
        }, 2000);
      });
    });
  }

  // Image upload & clear
  const uploadButtons = document.querySelectorAll('.image-upload-btn');
  const clearButtons = document.querySelectorAll('.image-clear-btn');
  const fileInputs = document.querySelectorAll('.image-file-input');

  uploadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isEditMode) return;
      const name = btn.dataset.imageName;
      const input = document.querySelector('.image-file-input[data-image-name="' + name + '"]');
      if (input) input.click();
    });
  });

  fileInputs.forEach(input => {
    input.addEventListener('change', () => {
      if (!input.files || !input.files[0]) return;
      const name = input.dataset.imageName;
      const formData = new FormData();
      formData.append('image', input.files[0]);

      fetch('/api/image?name=' + encodeURIComponent(name), {
        method: 'POST',
        body: formData
      })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      })
      .then(() => {
        const img = document.querySelector('img[data-image-name="' + name + '"]');
        if (img) {
          const baseSrc = 'images/' + name;
          img.src = baseSrc + '?ts=' + Date.now();
        }
        input.value = '';
      })
      .catch(() => {
        alert('Could not save image. Please try again.');
      });
    });
  });

  clearButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isEditMode) return;
      const name = btn.dataset.imageName;
      const img = document.querySelector('img[data-image-name="' + name + '"]');
      if (img) {
        img.src = 'images/' + name + '?ts=' + Date.now();
      }
    });
  });

  // Video link edit & clear
  const videoEditButtons = document.querySelectorAll('.video-edit-btn');
  const videoClearButtons = document.querySelectorAll('.video-clear-btn');

  videoEditButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isEditMode) return;
      const key = btn.dataset.videoKey;
      const current = contentData[key] || '';
      const url = window.prompt('Enter YouTube (or other) URL for this video:', current);
      if (!url) return;
      contentData[key] = url;
      const link = document.querySelector('.video-link[data-video-key="' + key + '"]');
      if (link) {
        link.href = url;
      }
    });
  });

  videoClearButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isEditMode) return;
      const key = btn.dataset.videoKey;
      contentData[key] = '#';
      const link = document.querySelector('.video-link[data-video-key="' + key + '"]');
      if (link) {
        link.href = '#';
      }
    });
  });
});
