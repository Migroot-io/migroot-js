// Auto-fill email on sign-up page from localStorage
(function() {
  console.log('📧 Email auto-fill script started');

  // Fill email input
  function fillEmailInput(email) {
    const emailInput = document.querySelector('input[type="email"][name="Person.Email"]');

    if (emailInput) {
      emailInput.value = email;
      console.log('✅ Email auto-filled:', email);

      // Trigger input event for validation
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      return true;
    }

    return false;
  }

  // Fill opt-in checkbox
  function fillOptInCheckbox(optIn) {
    const checkbox = document.querySelector('input[name="Person.OptInToEmailList"][type="checkbox"]');

    if (checkbox) {
      checkbox.checked = !!optIn;
      console.log('✅ Opt-in checkbox auto-filled:', !!optIn);

      // Trigger change event
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));

      return true;
    }

    return false;
  }

  // Wait for email input to appear and fill it
  function waitAndFill() {
    try {
      const quizResults = localStorage.getItem('quiz_results');
      if (!quizResults) {
        console.log('ℹ️ No quiz results found in localStorage');
        return;
      }

      const data = JSON.parse(quizResults);
      const email = data.email || data['contact-email'];
      const optIn = data.opt_in;

      if (!email) {
        console.log('ℹ️ No email found in quiz results');
        return;
      }

      console.log('📧 Found email in localStorage:', email);
      console.log('📬 Opt-in value:', optIn);

      // Try to fill immediately
      const emailFilled = fillEmailInput(email);
      const optInFilled = fillOptInCheckbox(optIn);

      if (emailFilled && optInFilled) {
        console.log('✅ All fields filled immediately');
        return;
      }

      // If not found, wait for them using MutationObserver
      console.log('⏳ Waiting for form fields to appear...');

      const observer = new MutationObserver((mutations, obs) => {
        let allFilled = true;

        if (!fillEmailInput(email)) {
          allFilled = false;
        }

        if (!fillOptInCheckbox(optIn)) {
          allFilled = false;
        }

        if (allFilled) {
          obs.disconnect();
          console.log('✅ All form fields found and filled');
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Stop observing after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        console.log('⏱️ Stopped waiting for form fields');
      }, 10000);

    } catch (e) {
      console.error('Failed to auto-fill form:', e);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndFill);
  } else {
    waitAndFill();
  }
})();
