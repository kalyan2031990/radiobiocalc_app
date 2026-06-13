# Mobile smoke

Status: PASS

```
> radiobiocalc-app@1.0.0 test:mobile-app-input-device
> cross-env INPUT_FOLDERS=C:\Users\Sampa\OneDrive\Desktop\input_folders\radbiocalc_input\rbGyaX_mobile_app_input tsx scripts/run_mobile_app_input_device_test.ts

Mobile device smoke: PASS (40503 ms)
  PASS push_composite: RBX-TXT-001_composite_DVH.txt → inbox + /sdcard/Download/rbGyaX_mobile_app_input/
  PASS select_dvh: Selected RBX-TXT-001_composite_DVH.txt
  PASS parse_composite: 2+ structures, Continue enabled
  SKIP setup_screen: Reached setup
```