# 데이터 접근 패턴 비교

> **학습 목표**: 백엔드에서 DB에 접근하는 4가지 패턴의 차이점 이해

---

## 왜 다양한 패턴이 존재하는가?

소프트웨어의 **복잡도**와 **변경 가능성**에 따라 적절한 추상화 수준이 다르기 때문입니다.

- 단순한 앱 → 추상화 적게 (빠른 개발)
- 복잡한 앱 → 추상화 많이 (유지보수 용이)

---

## 패턴 1: ORM 직접 사용 (가장 단순)

```typescript
// Service에서 Prisma/TypeORM을 직접 호출
class UserService {
  constructor(private prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

### 특징
| 장점 | 단점 |
|------|------|
| 빠른 개발, 코드량 적음 | Service가 특정 ORM에 강하게 결합 |
| 학습 곡선 낮음 | DB 교체 시 Service 전체 수정 필요 |

### 적합한 상황
- MVP, 프로토타입
- 단순 CRUD 앱
- DB 교체 가능성 없음

### 현재 프로젝트에서
Admin 모듈이 이 방식 사용 (`UsersService` → `PrismaService` 직접 호출)

---

## 패턴 2: DAO (Data Access Object)

```typescript
// 테이블과 1:1 매핑되는 클래스
class UserDAO {
  async findById(id: string): Promise<User> { ... }
  async save(user: User): Promise<void> { ... }
  async delete(id: string): Promise<void> { ... }
}

class UserService {
  constructor(private userDAO: UserDAO) {}

  async getUser(id: string) {
    return this.userDAO.findById(id);
  }
}
```

### 특징
| 장점 | 단점 |
|------|------|
| 데이터 접근 로직 분리 | 비즈니스 로직과 데이터 로직 분리가 애매 |
| 테스트 시 DAO만 모킹 가능 | 테이블당 하나의 DAO 필요 |

### 적합한 상황
- 단순 CRUD 애플리케이션
- 레거시 Java 프로젝트

---

## 패턴 3: Repository (도메인 중심)

```typescript
// 도메인 객체의 "컬렉션"처럼 동작
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;

  // 비즈니스 의미 있는 메서드명
  findActiveUsers(): Promise<User[]>;
  findUsersWithExpiredSubscription(): Promise<User[]>;
}

class UserService {
  constructor(private userRepository: UserRepository) {}

  async notifyExpiredUsers() {
    const users = await this.userRepository.findUsersWithExpiredSubscription();
    // 비즈니스 로직...
  }
}
```

### 특징
| 장점 | 단점 |
|------|------|
| 도메인 언어로 메서드 정의 | 구현 복잡 |
| DDD와 잘 어울림 | 오버엔지니어링 위험 |
| 테스트 용이 | 학습 곡선 높음 |

### DAO vs Repository 차이
| DAO | Repository |
|-----|------------|
| `findById`, `save`, `delete` (CRUD 중심) | `findActiveUsers` (도메인 중심) |
| 테이블 관점 | 도메인 객체 관점 |
| SQL 쿼리 추상화 | 비즈니스 규칙 캡슐화 |

### 적합한 상황
- 복잡한 비즈니스 로직
- DDD(Domain-Driven Design) 프로젝트
- 장기 유지보수 프로젝트

---

## 패턴 4: DataSource (데이터 소스 중심) ⭐

```typescript
// 데이터 소스의 추상화
interface MetricsDataSource {
  // 라이프사이클
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // 쿼리 메서드
  getRealtimeKPI(): Promise<RealtimeKPI>;
  getHourlyTraffic(params: TrafficParams): Promise<HourlyTraffic[]>;
  getTenantUsage(): Promise<TenantUsage[]>;
}

// 각 데이터 소스별 구현
class BigQueryDataSource implements MetricsDataSource { ... }
class PostgreSQLDataSource implements MetricsDataSource { ... }
class MongoDBDataSource implements MetricsDataSource { ... }
```

### 특징
| 장점 | 단점 |
|------|------|
| **다양한 데이터 소스** 지원에 최적화 | 인터페이스 설계 중요 |
| 데이터 소스별 최적화 가능 | 초기 설계 비용 |
| 분석/모니터링 시스템에 적합 | |

### Repository vs DataSource 차이
| Repository | DataSource |
|------------|------------|
| 도메인 객체 중심 | 데이터 소스 중심 |
| `User`, `Order` 같은 엔티티 | 쿼리 결과 (KPI, Traffic 등) |
| 단일 DB 가정 | 다중 DB 지원 |
| 비즈니스 규칙 캡슐화 | 쿼리 실행 추상화 |

### 적합한 상황
- 여러 종류의 DB 사용 (BigQuery + PostgreSQL + MongoDB)
- DB 교체 가능성 높음
- 분석/모니터링/리포팅 시스템
- 멀티테넌트 (프로젝트별 다른 DB)

---

## 비교 정리표

| 패턴 | 추상화 수준 | 복잡도 | 유연성 | 적합한 상황 |
|------|------------|--------|--------|------------|
| ORM 직접 | ⭐ | 낮음 | 낮음 | MVP, 단순 앱 |
| DAO | ⭐⭐ | 중간 | 중간 | CRUD 앱 |
| Repository | ⭐⭐⭐ | 높음 | 높음 | DDD, 복잡한 도메인 |
| **DataSource** | ⭐⭐⭐ | 중간 | **매우 높음** | **다중 DB, 분석 시스템** |

---

## 이 프로젝트에서 DataSource 패턴을 선택한 이유

1. **이미 2개 DB 사용 중**: BigQuery (분석용) + SQLite (Admin용)
2. **향후 확장성**: PostgreSQL, MySQL 등 추가 가능
3. **멀티테넌트**: 프로젝트별로 다른 DB 사용 가능
4. **분석 쿼리 중심**: 도메인 객체보다 **쿼리 결과** 중심

---

## 핵심 개념 정리

> **추상화(Abstraction)**: "어떻게"를 숨기고 "무엇을"만 노출
>
> **인터페이스**: 구현체가 반드시 제공해야 하는 메서드 목록 (계약)
>
> **의존성 역전**: 구체적인 것(BigQuery)이 아닌 추상적인 것(Interface)에 의존

```
❌ Service → BigQuery (구체적인 것에 의존)
✅ Service → Interface ← BigQuery (추상적인 것에 의존)
```
