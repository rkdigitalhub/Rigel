(function () {
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navLinks = document.querySelector('[data-nav-links]');
  var navGroups = document.querySelectorAll('.nav-group');

  function closeNavGroups(exceptGroup) {
    navGroups.forEach(function (group) {
      if (group !== exceptGroup) {
        group.classList.remove('open');
        var toggle = group.querySelector('.nav-group-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      if (!navLinks.classList.contains('open')) {
        closeNavGroups();
      }
    });
  }

  if (navGroups.length) {
    navGroups.forEach(function (group) {
      var toggle = group.querySelector('.nav-group-toggle');
      if (!toggle) {
        return;
      }

      toggle.addEventListener('click', function () {
        var isOpen = group.classList.contains('open');
        closeNavGroups(group);
        group.classList.toggle('open', !isOpen);
        toggle.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.nav-links')) {
        closeNavGroups();
      }
    });
  }

  var currentPage = document.body.getAttribute('data-page');
  if (currentPage) {
    var active = document.querySelector('[data-page-link="' + currentPage + '"]');
    if (active) {
      active.classList.add('active');

      var parentGroup = active.closest('.nav-group');
      if (parentGroup) {
        var groupToggle = parentGroup.querySelector('.nav-group-toggle');
        if (groupToggle) {
          groupToggle.classList.add('active');
        }
      }
    }
  }

  var liveTicker = document.querySelector('[data-live-ticker]');
  if (liveTicker && window.fetch) {
    var fallbackTickerItems = [
      { label: 'BNB/USD', value: 586.4, change: 1.08 },
      { label: 'BTC/USD', value: 62540, change: 2.15 },
      { label: 'ETH/USD', value: 3465, change: 1.32 },
      { label: 'SOL/USD', value: 142.6, change: -0.42 }
    ];
    var tickerSymbols = [
      { apiId: 'binancecoin', label: 'BNB/USD' },
      { apiId: 'bitcoin', label: 'BTC/USD' },
      { apiId: 'ethereum', label: 'ETH/USD' },
      { apiId: 'solana', label: 'SOL/USD' }
    ];

    function formatTickerValue(value) {
      var amount = Number(value);
      if (!isFinite(amount)) {
        return '$0.00';
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }

    function formatTickerChange(change) {
      var numericChange = Number(change);
      var safeChange = isFinite(numericChange) ? numericChange : 0;
      var className = safeChange >= 0 ? 'up' : 'down';
      var sign = safeChange >= 0 ? '+' : '';

      return '<span class="' + className + '">' + sign + safeChange.toFixed(2) + '%</span>';
    }

    function renderTicker(items) {
      liveTicker.innerHTML = items.map(function (item) {
        return '<span><b>' + item.label + '</b> ' + formatTickerValue(item.value) + ' ' + formatTickerChange(item.change) + '</span>';
      }).join('');
    }

    renderTicker(fallbackTickerItems);

    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true', {
      headers: {
        Accept: 'application/json'
      }
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Ticker request failed');
      }

      return response.json();
    }).then(function (data) {
      var liveItems = tickerSymbols.map(function (symbol) {
        var quote = data[symbol.apiId] || {};

        return {
          label: symbol.label,
          value: quote.usd,
          change: quote.usd_24h_change
        };
      }).filter(function (item) {
        return typeof item.value === 'number' && typeof item.change === 'number';
      });

      if (liveItems.length === tickerSymbols.length) {
        renderTicker(liveItems);
      }
    }).catch(function () {
      renderTicker(fallbackTickerItems);
    });
  }

  var forexTicker = document.querySelector('[data-forex-ticker]');
  if (forexTicker && window.fetch) {
    var forexFallback = [
      { label: 'EUR/USD', value: 1.0850, change: 0.14 },
      { label: 'GBP/USD', value: 1.2665, change: 0.08 },
      { label: 'USD/JPY', value: 149.42, change: -0.10 }
    ];

    function formatForexValue(label, value) {
      var amount = Number(value);
      if (!isFinite(amount)) {
        return '0.00';
      }

      return amount.toFixed(label === 'USD/JPY' ? 2 : 4);
    }

    function formatForexChange(change) {
      var safeChange = isFinite(Number(change)) ? Number(change) : 0;
      var className = safeChange >= 0 ? 'up' : 'down';
      var sign = safeChange >= 0 ? '+' : '';

      return '<span class="' + className + '">' + sign + safeChange.toFixed(2) + '%</span>';
    }

    function renderForexTicker(items) {
      forexTicker.innerHTML = items.map(function (item) {
        return '<span><b>' + item.label + '</b> ' + formatForexValue(item.label, item.value) + ' ' + formatForexChange(item.change) + '</span>';
      }).join('');
    }

    renderForexTicker(forexFallback);

    function getPrevTradingDate() {
      var d = new Date();
      d.setDate(d.getDate() - 1);
      if (d.getDay() === 0) { d.setDate(d.getDate() - 2); }
      if (d.getDay() === 6) { d.setDate(d.getDate() - 1); }

      return d.toISOString().split('T')[0];
    }

    var prevDate = getPrevTradingDate();

    Promise.all([
      fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY', { headers: { Accept: 'application/json' } }),
      fetch('https://api.frankfurter.app/' + prevDate + '?from=USD&to=EUR,GBP,JPY', { headers: { Accept: 'application/json' } })
    ]).then(function (responses) {
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error('Forex request failed');
      }

      return Promise.all([responses[0].json(), responses[1].json()]);
    }).then(function (data) {
      var latest = data[0].rates;
      var prev = data[1].rates;

      if (!latest.EUR || !latest.GBP || !latest.JPY || !prev.EUR || !prev.GBP || !prev.JPY) {
        throw new Error('Incomplete forex data');
      }

      var eurUsdNow = 1 / latest.EUR;
      var gbpUsdNow = 1 / latest.GBP;
      var usdJpyNow = latest.JPY;

      var eurUsdPrev = 1 / prev.EUR;
      var gbpUsdPrev = 1 / prev.GBP;
      var usdJpyPrev = prev.JPY;

      renderForexTicker([
        { label: 'EUR/USD', value: eurUsdNow, change: ((eurUsdNow - eurUsdPrev) / eurUsdPrev) * 100 },
        { label: 'GBP/USD', value: gbpUsdNow, change: ((gbpUsdNow - gbpUsdPrev) / gbpUsdPrev) * 100 },
        { label: 'USD/JPY', value: usdJpyNow, change: ((usdJpyNow - usdJpyPrev) / usdJpyPrev) * 100 }
      ]);
    }).catch(function () {
      renderForexTicker(forexFallback);
    });
  }

  var cryptoMetricRows = document.querySelectorAll('[data-crypto-metrics]');
  if (cryptoMetricRows.length && window.fetch) {
    function formatSpreadPercent(bid, ask) {
      var bidPrice = Number(bid);
      var askPrice = Number(ask);
      if (!isFinite(bidPrice) || !isFinite(askPrice) || bidPrice <= 0 || askPrice <= 0) {
        return null;
      }

      var mid = (bidPrice + askPrice) / 2;
      if (!isFinite(mid) || mid <= 0) {
        return null;
      }

      return (((askPrice - bidPrice) / mid) * 100).toFixed(2) + '%';
    }

    function formatLeverage(value) {
      var maxLev = Number(value);
      if (!isFinite(maxLev) || maxLev <= 0) {
        return null;
      }

      return '1:' + Math.round(maxLev);
    }

    cryptoMetricRows.forEach(function (row) {
      var symbol = row.getAttribute('data-crypto-symbol');
      var spreadNode = row.querySelector('[data-spread]');
      var leverageNode = row.querySelector('[data-leverage]');

      if (!symbol || !spreadNode || !leverageNode) {
        return;
      }

      var tickerUrl = 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=' + encodeURIComponent(symbol);
      var leverageUrl = 'https://api.bybit.com/v5/market/instruments-info?category=linear&symbol=' + encodeURIComponent(symbol);

      Promise.all([
        fetch(tickerUrl, { headers: { Accept: 'application/json' } }),
        fetch(leverageUrl, { headers: { Accept: 'application/json' } })
      ]).then(function (responses) {
        if (!responses[0].ok || !responses[1].ok) {
          throw new Error('Crypto metrics request failed');
        }

        return Promise.all([responses[0].json(), responses[1].json()]);
      }).then(function (result) {
        var tickerData = result[0];
        var leverageData = result[1];

        var tickerItem = tickerData && tickerData.result && tickerData.result.list && tickerData.result.list[0];
        var leverageItem = leverageData && leverageData.result && leverageData.result.list && leverageData.result.list[0];

        var spreadText = tickerItem ? formatSpreadPercent(tickerItem.bid1Price, tickerItem.ask1Price) : null;
        var leverageText = leverageItem && leverageItem.leverageFilter ? formatLeverage(leverageItem.leverageFilter.maxLeverage) : null;

        if (spreadText) {
          spreadNode.textContent = spreadText;
        }

        if (leverageText) {
          leverageNode.textContent = leverageText;
        }
      }).catch(function () {
        // Keep existing fallback values in markup if the API is unavailable.
      });
    });
  }

  var revealNodes = document.querySelectorAll('.reveal');
  if (revealNodes.length) {
    revealNodes.forEach(function (node, index) {
      node.style.transitionDelay = Math.min(index * 70, 420) + 'ms';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    revealNodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  var slider = document.querySelector('[data-testimonial-slider]');
  if (slider) {
    var track = slider.querySelector('[data-testimonial-track]');
    var slides = track ? track.querySelectorAll('.quote-card') : [];
    var prevBtn = slider.querySelector('[data-testimonial-prev]');
    var nextBtn = slider.querySelector('[data-testimonial-next]');
    var dots = slider.querySelectorAll('[data-slide-to]');
    var activeIndex = 0;
    var autoplayId = null;

    function renderSlider(index) {
      if (!track || !slides.length) {
        return;
      }

      activeIndex = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + activeIndex * 100 + '%)';

      dots.forEach(function (dot, dotIndex) {
        var isActive = dotIndex === activeIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-current', String(isActive));
      });
    }

    function startAutoplay() {
      if (autoplayId || slides.length < 2) {
        return;
      }

      autoplayId = window.setInterval(function () {
        renderSlider(activeIndex + 1);
      }, 5000);
    }

    function stopAutoplay() {
      if (!autoplayId) {
        return;
      }

      window.clearInterval(autoplayId);
      autoplayId = null;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        renderSlider(activeIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        renderSlider(activeIndex + 1);
      });
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = Number(dot.getAttribute('data-slide-to'));
        renderSlider(index);
      });
    });

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', startAutoplay);

    renderSlider(0);
    startAutoplay();
  }

  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    var toast = document.querySelector('[data-contact-toast]');
    var toastClose = document.querySelector('[data-contact-toast-close]');
    var toastTitle = toast ? toast.querySelector('strong') : null;
    var toastMessage = toast ? toast.querySelector('p') : null;
    var submitButton = contactForm.querySelector('[data-contact-submit]');
    var defaultSubmitLabel = submitButton ? submitButton.textContent : '';
    var toastTimerId = null;

    function showContactToast(variant, title, message) {
      if (!toast) {
        return;
      }

      toast.classList.remove('is-error');
      if (variant === 'error') {
        toast.classList.add('is-error');
      }

      if (toastTitle) {
        toastTitle.textContent = title;
      }

      if (toastMessage) {
        toastMessage.textContent = message;
      }

      toast.classList.add('show');
      toast.setAttribute('aria-hidden', 'false');

      if (toastTimerId) {
        window.clearTimeout(toastTimerId);
      }

      toastTimerId = window.setTimeout(function () {
        toast.classList.remove('show');
        toast.setAttribute('aria-hidden', 'true');
      }, 4500);
    }

    if (toastClose && toast) {
      toastClose.addEventListener('click', function () {
        toast.classList.remove('show');
        toast.setAttribute('aria-hidden', 'true');
        if (toastTimerId) {
          window.clearTimeout(toastTimerId);
          toastTimerId = null;
        }
      });
    }

    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!contactForm.reportValidity()) {
        return;
      }

      var formData = new FormData(contactForm);
      var fullName = String(formData.get('fullName') || '').trim();
      var email = String(formData.get('email') || '').trim();
      var phone = String(formData.get('phone') || '').trim();
      var topic = String(formData.get('topic') || '').trim();
      var message = String(formData.get('message') || '').trim();
      var endpoint = contactForm.getAttribute('data-contact-endpoint');
      var payload = new FormData();

      payload.append('name', fullName);
      payload.append('email', email);
      payload.append('phone', phone || 'Not provided');
      payload.append('topic', topic || 'General enquiry');
      payload.append('message', message);
      payload.append('_subject', 'Rigel Market Contact Query' + (topic ? ' - ' + topic : ''));
      payload.append('_captcha', 'false');
      payload.append('_template', 'table');

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: payload
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      }).then(function () {
        contactForm.reset();
        showContactToast('success', 'Message sent', 'Your support request has been sent to support@rigelmarket.com.');
      }).catch(function () {
        showContactToast('error', 'Message not sent', 'The request could not be completed right now. Please try again shortly or email support directly.');
      }).finally(function () {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = defaultSubmitLabel;
        }
      });
    });
  }
})();
