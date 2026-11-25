package in.husainbw.invitations;

// The phone's contacts, for the web app's Add Family form.
//
// Chrome's own contact picker loses the pick on some phones (it opens the
// Contacts app, which sends the app to the background, and Chrome cancels the
// pick). This screen reads the contacts itself instead:
//
//   1. The web app opens it with
//      intent://contacts?return=<page url>#Intent;scheme=invitationsapp;package=...;end
//   2. It explains why it needs contacts, then asks Android for the
//      Contacts permission (once).
//   3. It lists every contact that has a phone number, with search and tick
//      boxes. Nothing leaves the phone here.
//   4. On Add, it opens the app again at <page url> with the ticked contacts
//      in the URL fragment (#...&contacts=...). A fragment is never sent to a
//      server, and the web app removes it from the address as soon as it reads it.
//
// IMPORTANT: this file and the activity entry in AndroidManifest.xml are our
// own code. `bubblewrap update` regenerates the project and would remove them;
// build with ../build.sh, which never regenerates.

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class ContactsActivity extends Activity {

    // Only ever hand contacts back to our own site.
    private static final String SITE = "https://invitations.husainbw.in/";
    private static final int REQUEST_CONTACTS = 7;
    // Keeps the hand-back URL a sensible size.
    private static final int MAX_PICK = 200;

    // Coral, the app's theme (public/coral-theme.css).
    private static final int PAPER = Color.rgb(0xF8, 0xF4, 0xF1);
    private static final int COTTON = Color.rgb(0xFD, 0xFB, 0xF8);
    private static final int INK = Color.rgb(0x2B, 0x24, 0x20);
    private static final int MUTED = Color.rgb(0x6F, 0x65, 0x5F);
    private static final int RULE = Color.rgb(0xD9, 0xD3, 0xCF);
    private static final int BOARD = Color.rgb(0x23, 0x1C, 0x19);
    private static final int BOARD_TYPE = Color.rgb(0xF4, 0xEF, 0xE9);

    private static final class Contact {
        final long id;
        final String name;
        final List<String> phones = new ArrayList<>();
        Contact(long id, String name) { this.id = id; this.name = name; }
    }

    private String returnUrl;
    private final List<Contact> all = new ArrayList<>();
    private final List<Contact> shown = new ArrayList<>();
    private final Set<Long> picked = new LinkedHashSet<>();
    private final Handler main = new Handler(Looper.getMainLooper());

    private TextView status;
    private ListView list;
    private Button addButton;
    private ContactAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        returnUrl = safeReturnUrl(getIntent());
        buildScreen();
        if (hasPermission()) loadContacts();
        else explainThenAsk();
    }

    // ------------------------------------------------------------ hand-back

    /** The page to go back to: ours only, never an arbitrary link. */
    private static String safeReturnUrl(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        String back = data == null ? null : data.getQueryParameter("return");
        if (back == null || !back.startsWith(SITE)) return SITE;
        return back;
    }

    private void finishWithPicks() {
        JSONArray out = new JSONArray();
        try {
            for (Contact c : all) {
                if (!picked.contains(c.id)) continue;
                JSONObject o = new JSONObject();
                o.put("n", c.name);
                o.put("p", new JSONArray(c.phones));
                out.put(o);
            }
        } catch (Exception e) {
            finish();
            return;
        }
        String encoded = Base64.encodeToString(out.toString().getBytes(StandardCharsets.UTF_8),
                Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        String url = withPicks(returnUrl, encoded);
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url), this, LauncherActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(open);
        finish();
    }

    /** Adds contacts=... to the URL's fragment (the part after #). */
    static String withPicks(String url, String encoded) {
        int hash = url.indexOf('#');
        if (hash < 0) return url + "#/?contacts=" + encoded;
        String fragment = url.substring(hash + 1).replaceAll("[?&]contacts=[^&]*", "");
        String joiner = fragment.contains("?") ? "&" : "?";
        return url.substring(0, hash) + "#" + fragment + joiner + "contacts=" + encoded;
    }

    // ------------------------------------------------------------ permission

    private boolean hasPermission() {
        return Build.VERSION.SDK_INT < 23
                || checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
    }

    /** Google Play asks for a clear in-app reason before the system prompt. */
    private void explainThenAsk() {
        new AlertDialog.Builder(this)
                .setTitle("Pick guests from your contacts")
                .setMessage("Invitations shows your phone's contacts here so you can tick the "
                        + "people to invite. Your contacts stay on this phone: only the people you "
                        + "pick are added to your guest list.")
                .setPositiveButton("Continue", (d, w) ->
                        requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, REQUEST_CONTACTS))
                .setNegativeButton("Not now", (d, w) -> finish())
                .setOnCancelListener(d -> finish())
                .show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQUEST_CONTACTS) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            loadContacts();
            return;
        }
        // Denied. If Android won't ask again, offer the Settings page.
        boolean canAskAgain = Build.VERSION.SDK_INT >= 23
                && shouldShowRequestPermissionRationale(Manifest.permission.READ_CONTACTS);
        AlertDialog.Builder b = new AlertDialog.Builder(this)
                .setTitle("Contacts not allowed")
                .setMessage("Without the Contacts permission, type the family's name and number "
                        + "in the form instead.")
                .setNegativeButton("Back", (d, w) -> finish())
                .setOnCancelListener(d -> finish());
        if (!canAskAgain) {
            b.setPositiveButton("Open settings", (d, w) -> {
                Intent settings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.fromParts("package", getPackageName(), null));
                startActivity(settings);
                finish();
            });
        }
        b.show();
    }

    // ------------------------------------------------------------ contacts

    private void loadContacts() {
        status.setText("Loading your contacts…");
        status.setVisibility(View.VISIBLE);
        new Thread(() -> {
            List<Contact> found = readContacts();
            main.post(() -> {
                all.clear();
                all.addAll(found);
                filter("");
                status.setVisibility(found.isEmpty() ? View.VISIBLE : View.GONE);
                if (found.isEmpty()) status.setText("No contacts with a phone number on this phone.");
            });
        }).start();
    }

    /** Every contact with at least one number, A to Z, numbers de-duplicated. */
    private List<Contact> readContacts() {
        Map<Long, Contact> byId = new LinkedHashMap<>();
        String[] columns = {
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
        };
        try (Cursor c = getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI, columns, null, null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY + " COLLATE NOCASE ASC")) {
            if (c == null) return new ArrayList<>();
            Map<Long, Set<String>> seen = new LinkedHashMap<>();
            while (c.moveToNext()) {
                long id = c.getLong(0);
                String name = c.getString(1);
                String number = c.getString(2);
                if (number == null || number.trim().isEmpty()) continue;
                Contact contact = byId.get(id);
                if (contact == null) {
                    contact = new Contact(id, name == null ? "" : name.trim());
                    byId.put(id, contact);
                    seen.put(id, new LinkedHashSet<>());
                }
                String digits = number.replaceAll("[^0-9]", "");
                String key = digits.length() > 10 ? digits.substring(digits.length() - 10) : digits;
                if (seen.get(id).add(key)) contact.phones.add(number.trim());
            }
        } catch (SecurityException e) {
            return new ArrayList<>();
        }
        return new ArrayList<>(byId.values());
    }

    private void filter(String query) {
        String q = query.trim().toLowerCase(Locale.ROOT);
        String qDigits = q.replaceAll("[^0-9]", "");
        shown.clear();
        for (Contact c : all) {
            if (q.isEmpty() || c.name.toLowerCase(Locale.ROOT).contains(q) || matchesNumber(c, qDigits)) {
                shown.add(c);
            }
        }
        adapter.notifyDataSetChanged();
    }

    private static boolean matchesNumber(Contact c, String digits) {
        if (digits.length() < 3) return false;
        for (String p : c.phones) if (p.replaceAll("[^0-9]", "").contains(digits)) return true;
        return false;
    }

    private void toggle(Contact c) {
        if (picked.contains(c.id)) picked.remove(c.id);
        else if (picked.size() < MAX_PICK) picked.add(c.id);
        adapter.notifyDataSetChanged();
        updateAddButton();
    }

    private void updateAddButton() {
        int n = picked.size();
        addButton.setEnabled(n > 0);
        addButton.setAlpha(n > 0 ? 1f : 0.45f);
        addButton.setText(n == 0 ? "Add" : n == 1 ? "Add 1 contact" : "Add " + n + " contacts");
    }

    // ------------------------------------------------------------ screen

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private GradientDrawable rounded(int fill, int stroke, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(dp(radius));
        if (stroke != 0) g.setStroke(dp(1), stroke);
        return g;
    }

    private void buildScreen() {
        getWindow().setStatusBarColor(PAPER);
        getWindow().setNavigationBarColor(PAPER);
        if (Build.VERSION.SDK_INT >= 23) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);
        // Android 15+ draws apps under the system bars; keep clear of them.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                top = bars.top;
                bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
            return insets;
        });

        TextView title = new TextView(this);
        title.setText("Pick from contacts");
        title.setTextColor(INK);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        title.setPadding(dp(20), dp(20), dp(20), dp(4));
        root.addView(title);

        TextView hint = new TextView(this);
        hint.setText("Tick everyone to invite. Each person becomes a family on your list.");
        hint.setTextColor(MUTED);
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        hint.setPadding(dp(20), 0, dp(20), dp(12));
        root.addView(hint);

        EditText search = new EditText(this);
        search.setHint("Search name or number");
        search.setSingleLine(true);
        search.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        search.setTextColor(INK);
        search.setHintTextColor(MUTED);
        search.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        search.setBackground(rounded(COTTON, MUTED, 6));
        search.setPadding(dp(14), 0, dp(14), 0);
        LinearLayout.LayoutParams searchLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        searchLp.setMargins(dp(16), 0, dp(16), dp(8));
        root.addView(search, searchLp);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            public void onTextChanged(CharSequence s, int a, int b, int c) {}
            public void afterTextChanged(Editable s) { filter(s.toString()); }
        });

        status = new TextView(this);
        status.setTextColor(MUTED);
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        status.setGravity(Gravity.CENTER);
        status.setPadding(dp(24), dp(32), dp(24), dp(32));
        status.setVisibility(View.GONE);
        root.addView(status);

        list = new ListView(this);
        list.setDivider(null);
        list.setBackgroundColor(PAPER);
        adapter = new ContactAdapter();
        list.setAdapter(adapter);
        list.setOnItemClickListener((parent, view, position, id) -> toggle(shown.get(position)));
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setPadding(dp(16), dp(12), dp(16), dp(12));
        bar.setBackgroundColor(PAPER);

        Button cancel = new Button(this);
        cancel.setText("Cancel");
        cancel.setAllCaps(false);
        cancel.setTextColor(INK);
        cancel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        cancel.setBackground(rounded(COTTON, RULE, 8));
        cancel.setOnClickListener(v -> finish());
        LinearLayout.LayoutParams cancelLp = new LinearLayout.LayoutParams(0, dp(48), 1f);
        cancelLp.setMarginEnd(dp(10));
        bar.addView(cancel, cancelLp);

        addButton = new Button(this);
        addButton.setAllCaps(false);
        addButton.setTextColor(BOARD_TYPE);
        addButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        addButton.setBackground(rounded(BOARD, 0, 8));
        addButton.setOnClickListener(v -> finishWithPicks());
        bar.addView(addButton, new LinearLayout.LayoutParams(0, dp(48), 1.4f));
        updateAddButton();

        View rule = new View(this);
        rule.setBackgroundColor(RULE);
        root.addView(rule, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)));
        root.addView(bar);

        setContentView(root);
    }

    private final class ContactAdapter extends BaseAdapter {
        @Override public int getCount() { return shown.size(); }
        @Override public Object getItem(int position) { return shown.get(position); }
        @Override public long getItemId(int position) { return shown.get(position).id; }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            LinearLayout row;
            TextView name, number;
            CheckBox box;
            if (convertView == null) {
                row = new LinearLayout(ContactsActivity.this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER_VERTICAL);
                row.setPadding(dp(20), dp(10), dp(12), dp(10));
                row.setMinimumHeight(dp(60));

                LinearLayout text = new LinearLayout(ContactsActivity.this);
                text.setOrientation(LinearLayout.VERTICAL);
                name = new TextView(ContactsActivity.this);
                name.setTextColor(INK);
                name.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
                name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
                number = new TextView(ContactsActivity.this);
                number.setTextColor(MUTED);
                number.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                text.addView(name);
                text.addView(number);
                row.addView(text, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

                box = new CheckBox(ContactsActivity.this);
                box.setClickable(false);
                box.setFocusable(false);
                row.addView(box);
                row.setTag(new View[]{name, number, box});
            } else {
                row = (LinearLayout) convertView;
                View[] parts = (View[]) row.getTag();
                name = (TextView) parts[0];
                number = (TextView) parts[1];
                box = (CheckBox) parts[2];
            }
            Contact c = shown.get(position);
            name.setText(c.name.isEmpty() ? c.phones.get(0) : c.name);
            String more = c.phones.size() > 1 ? "  +" + (c.phones.size() - 1) + " more" : "";
            number.setText(c.phones.get(0) + more);
            box.setChecked(picked.contains(c.id));
            return row;
        }
    }
}
