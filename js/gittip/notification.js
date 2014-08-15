/**
 * Display a notification
 * @param {string} text  Notification text
 * @param {string} [type=notice]  Notofication type (one of: notice, error, success)
 */
Gratipay.notification = function(text, type, timeout) {
    var type = type || 'notice';
    var timeout = timeout || 10000;

    var dialog = ['div', { 'class': 'notification notification-' + type }, [ 'div', text ]];
    var $dialog = $([
        Gratipay.jsonml(dialog),
        Gratipay.jsonml(dialog)
    ]);

    if (!$('#notification-area').length)
        $('body').prepend('<div id="notification-area"><div class="notifications-fixed"></div></div>');

    $('#notification-area').prepend($dialog.get(0));
    $('#notification-area .notifications-fixed').prepend($dialog.get(1));

    function fadeOut() {
        $dialog.addClass('fade-out');
    }

    $dialog.on('click', fadeOut);
    if (timeout > 0) setTimeout(fadeOut, timeout);
};
