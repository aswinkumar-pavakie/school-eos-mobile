# Integration tests

Reserved for tests that exercise multiple services together against a real
(or realistically faked) backend contract - e.g. sign-in → session hydration
→ an authenticated request, or enqueue → sync pass → server outcome handling
end to end. None exist yet because no feature has real API integration to
exercise; add them alongside the first feature that does; do not add
placeholder tests here to fill the folder.
