# Development Rules

## Validation

- 코드 수정 후 완료 전에 반드시 `yarn ready`를 실행한다. 검증을 임의로 생략하지 않는다.
- `yarn ready`는 Biome autofix·재검증, unused code/dependency 검사, TypeScript build check, Vite production build를 수행한다.
- 실패하면 원인을 수정하고 다시 실행한다. 성공하기 전에는 작업 완료로 간주하지 않는다.
- autofix가 파일을 추가로 수정할 수 있으므로 실행 후 반드시 최종 diff를 확인한다.

## Mobile validation

- 다음 영역을 수정하면 `yarn ready` 외에 `yarn test:mobile`도 실행하고 통과시킨다:
  - mobile layout, responsive CSS, viewport handling, safe-area
  - touch / pointer gesture, scroll behavior, scroll snap, scrubber
  - mobile navigation, iOS Safari / WebView compatibility

## Git safety

- 필수 검증이 실패한 상태에서는 commit하지 않는다. 검증 후 최종 diff를 확인한다.
- 사용자의 unrelated changes를 임의로 stage하거나 commit하지 않는다.
- `git add .`을 무조건 사용하지 않고 이번 작업과 관련된 변경만 포함한다.
- destructive git command를 임의로 실행하지 않는다.

## Implementation

- 문제를 먼저 분석하고 필요한 최소 범위만 수정한다.
- 잘 동작하는 기존 코드를 불필요하게 재작성하지 않는다.
- 새로운 dependency는 꼭 필요한 경우에만 추가한다.
- desktop / mobile 양쪽의 regression 여부를 확인한다.
