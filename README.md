# UK Plate Decoder

A small static website that decodes UK vehicle registration plates. Type a plate and it tells you what each character means, where the plate was allocated and when the vehicle was first registered.

## What it decodes

| Format | Example | What you get |
| --- | --- | --- |
| Current (Sep 2001 onwards) | `LA76 KXR` | Region and DVLA office from the memory tag, registration period and vehicle age from the age identifier, validity checks |
| Prefix (1983–2001) | `P472 FKL` | Registration period from the year letter |
| Suffix (1963–1983) | `TWD 451K` | Registration period from the year letter |
| Northern Ireland | `AIZ 4821` | County code (always contains I or Z) |
| Q plates | `Q314 DBX` | Age or identity unknown |
| Dateless | `MB 27` | Area code and serial |

It also shows the full age identifier calendar (51 to the current release) and every memory tag region with its office ranges. The current and next age identifiers are worked out from today's date, so nothing needs updating each March and September.

The decoder only reads the format. It doesn't look up make, tax or MOT; that needs the [DVLA vehicle enquiry service](https://vehicleenquiry.service.gov.uk/).

## Running it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Link straight to a plate with a hash: `index.html#LA76KXR`.

## Tests

```sh
node --test
```

## Files

- `decoder.js` – the decoding rules, as pure functions (works in the browser and Node)
- `app.js` – page behaviour
- `styles.css` – styles, light and dark themes
- `decoder.test.js` – unit tests

## Hosting on GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Notes on the data

Office names are the original 2001 memory-tag allocations. Most DVLA local offices closed in 2013, so on newer plates the tag shows the region the plate was allocated to rather than where the car was sold.
