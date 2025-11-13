(function() {
  console.log('🎯 Capty Tracking Script Loaded!');
  console.log('URL:', window.location.href);

  // Get capty_click_id from URL parameters
  function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

  var captyClickId = getUrlParameter('capty_click_id');
  var captyUserId = getUrlParameter('capty_user_id');

  console.log('📍 URL Parameters:', {
    capty_click_id: captyClickId || 'not found',
    capty_user_id: captyUserId || 'not found'
  });

  // Store in sessionStorage
  if (captyClickId) {
    console.log('💾 Storing in sessionStorage:', captyClickId);
    sessionStorage.setItem('capty_click_id', captyClickId);
    if (captyUserId) {
      sessionStorage.setItem('capty_user_id', captyUserId);
    }
  } else {
    console.log('ℹ️ No capty_click_id in URL, checking sessionStorage...');
  }

  // Retrieve from sessionStorage
  captyClickId = sessionStorage.getItem('capty_click_id');
  captyUserId = sessionStorage.getItem('capty_user_id');

  console.log('📦 SessionStorage values:', {
    capty_click_id: captyClickId || 'not found',
    capty_user_id: captyUserId || 'not found'
  });

  // Function to add attributes to cart
  function addCaptyAttributesToCart() {
    console.log('🔄 addCaptyAttributesToCart() called');

    if (!captyClickId) {
      console.log('❌ No captyClickId, skipping cart update');
      return;
    }

    console.log('✅ Updating cart with:', {
      capty_click_id: captyClickId,
      capty_user_id: captyUserId || ''
    });

    fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attributes: {
          'capty_click_id': captyClickId,
          'capty_user_id': captyUserId || ''
        }
      })
    })
    .then(response => {
      console.log('📡 Cart update response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('✅ Capty tracking added to cart:', captyClickId);
      console.log('📦 Cart data:', data);
    })
    .catch(error => {
      console.error('❌ Error adding Capty tracking:', error);
    });
  }

  // Add to cart when user adds product
  if (captyClickId) {
    console.log('✅ captyClickId found, setting up tracking...');

    // Listen for add to cart events
    document.addEventListener('DOMContentLoaded', function() {
      console.log('📄 DOM loaded, adding cart tracking');

      // Add immediately when page loads
      console.log('⚡ Adding tracking immediately on page load');
      addCaptyAttributesToCart();

      // Monitor cart changes
      var cartForms = document.querySelectorAll('form[action="/cart/add"]');
      console.log('🔍 Found ' + cartForms.length + ' cart forms');
      cartForms.forEach(function(form) {
        form.addEventListener('submit', function() {
          console.log('📝 Cart form submitted');
          setTimeout(addCaptyAttributesToCart, 500);
        });
      });

      // Monitor AJAX cart additions
      var addToCartButtons = document.querySelectorAll('[name="add"], [type="submit"]');
      console.log('🔍 Found ' + addToCartButtons.length + ' add to cart buttons');
      addToCartButtons.forEach(function(button) {
        button.addEventListener('click', function() {
          console.log('🖱️ Add to cart button clicked');
          setTimeout(addCaptyAttributesToCart, 500);
        });
      });
    });
  } else {
    console.log('⚠️ No captyClickId found, tracking will NOT be added');
  }

  console.log('🏁 Capty Tracking Script initialization complete');
})();
