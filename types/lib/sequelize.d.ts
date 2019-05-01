import * as DataTypes from './data-types';
import * as Deferrable from './deferrable';
import { HookReturn, SequelizeHooks, SequelizeHooksBase } from './hooks';
import { ValidationOptions } from './instance-validator';
import {
  AndOperator,
  BulkCreateOptions,
  CreateOptions,
  DestroyOptions,
  DropOptions,
  FindOptions,
  InstanceDestroyOptions,
  Logging,
  Model,
  ModelAttributeColumnOptions,
  ModelAttributes,
  ModelOptions,
  OrOperator,
  UpdateOptions,
  WhereAttributeHash,
  WhereOperators,
} from './model';
import { ModelManager } from './model-manager';
import * as Op from './operators';
import { Promise } from './promise';
import { QueryInterface, QueryOptions, QueryOptionsWithModel, QueryOptionsWithType } from './query-interface';
import QueryTypes = require('./query-types');
import { Transaction, TransactionOptions } from './transaction';
import { Cast, Col, Fn, Json, Literal, Where } from './utils';
// tslint:disable-next-line:no-duplicate-imports
import * as Utils from './utils';
import { validator } from './utils/validator-extras';
import { ConnectionManager } from './connection-manager';

/**
 * Sync Options
 */
export interface SyncOptions extends Logging {
  /**
   * If force is true, each DAO will do DROP TABLE IF EXISTS ..., before it tries to create its own table
   */
  force?: boolean;

  /**
   * Match a regex against the database name before syncing, a safety check for cases where force: true is
   * used in tests but not live code
   */
  match?: RegExp;

  /**
   * The schema that the tables should be created in. This can be overridden for each table in sequelize.define
   */
  schema?: string;
}

export interface DefaultSetOptions {}

/**
 * Connection Pool options
 */
export interface PoolOptions {
  /**
   * Maximum number of connections in pool. Default is 5
   */
  max?: number;

  /**
   * Minimum number of connections in pool. Default is 0
   */
  min?: number;

  /**
   * The maximum time, in milliseconds, that a connection can be idle before being released
   */
  idle?: number;

  /**
   * The maximum time, in milliseconds, that pool will try to get connection before throwing error
   */
  acquire?: number;

  /**
   * A function that validates a connection. Called with client. The default function checks that client is an
   * object, and that its state is not disconnected
   */
  validate?(client?: unknown): boolean;
}

export interface ConnectionOptions {
  host?: string;
  port?: string | number;
  username?: string;
  password?: string;
  database?: string;
}

/**
 * Interface for replication Options in the sequelize constructor
 */
export interface ReplicationOptions {
  read: ConnectionOptions[];

  write: ConnectionOptions;
}

/**
 * Final config options generated by sequelize.
 */
export interface Config {
  readonly database: string;
  readonly dialectModule?: object;
  readonly host?: string;
  readonly port?: string;
  readonly username: string;
  readonly password: string | null;
  readonly pool?: {
    readonly acquire: number;
    readonly idle: number;
    readonly max: number;
    readonly min: number;
  };
  readonly protocol: 'tcp';
  readonly native: boolean;
  readonly ssl: boolean;
  readonly replication: boolean;
  readonly dialectModulePath: null | string;
  readonly keepDefaultTimezone?: boolean;
  readonly dialectOptions?: {
    readonly charset?: string;
    readonly timeout?: number;
  };
}

export type Dialect =  'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'mariadb';

export interface RetryOptions {
  match?: (RegExp | string | Function)[];
  max?: number;
}

/**
 * Options for the constructor of Sequelize main class
 */
export interface Options extends Logging {
  /**
   * The dialect of the database you are connecting to. One of mysql, postgres, sqlite, mariadb and mssql.
   *
   * @default 'mysql'
   */
  dialect?: Dialect;

  /**
   * If specified, will use the provided module as the dialect.
   *
   * @example
   * `dialectModule: require('@myorg/tedious'),`
   */
  dialectModule?: object;


  /**
   * If specified, load the dialect library from this path. For example, if you want to use pg.js instead of
   * pg when connecting to a pg database, you should specify 'pg.js' here
   */
  dialectModulePath?: string;

  /**
   * An object of additional options, which are passed directly to the connection library
   */
  dialectOptions?: object;

  /**
   * Only used by sqlite.
   *
   * @default ':memory:'
   */
  storage?: string;

  /**
   * The name of the database
   */
  database?: string;

  /**
   * The username which is used to authenticate against the database.
   */
  username?: string;

  /**
   * The password which is used to authenticate against the database.
   */
  password?: string;

  /**
   * The host of the relational database.
   *
   * @default 'localhost'
   */
  host?: string;

  /**
   * The port of the relational database.
   */
  port?: number;

  /**
   * A flag that defines if is used SSL.
   */
  ssl?: boolean;

  /**
   * The protocol of the relational database.
   *
   * @default 'tcp'
   */
  protocol?: string;

  /**
   * Default options for model definitions. See Model.init.
   */
  define?: ModelOptions;

  /**
   * Default options for sequelize.query
   */
  query?: QueryOptions;

  /**
   * Default options for sequelize.set
   */
  set?: DefaultSetOptions;

  /**
   * Default options for sequelize.sync
   */
  sync?: SyncOptions;

  /**
   * The timezone used when converting a date from the database into a JavaScript date. The timezone is also
   * used to SET TIMEZONE when connecting to the server, to ensure that the result of NOW, CURRENT_TIMESTAMP
   * and other time related functions have in the right timezone. For best cross platform performance use the
   * format
   * +/-HH:MM. Will also accept string versions of timezones used by moment.js (e.g. 'America/Los_Angeles');
   * this is useful to capture daylight savings time changes.
   *
   * @default '+00:00'
   */
  timezone?: string;

  /**
   * A flag that defines if null values should be passed to SQL queries or not.
   *
   * @default false
   */
  omitNull?: boolean;

  /**
   * A flag that defines if native library shall be used or not. Currently only has an effect for postgres
   *
   * @default false
   */
  native?: boolean;

  /**
   * Use read / write replication. To enable replication, pass an object, with two properties, read and write.
   * Write should be an object (a single server for handling writes), and read an array of object (several
   * servers to handle reads). Each read/write server can have the following properties: `host`, `port`,
   * `username`, `password`, `database`
   *
   * @default false
   */
  replication?: ReplicationOptions;

  /**
   * Connection pool options
   */
  pool?: PoolOptions;

  /**
   * Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of
   * them.
   *
   * @default true
   */
  quoteIdentifiers?: boolean;

  /**
   * Set the default transaction isolation level. See `Sequelize.Transaction.ISOLATION_LEVELS` for possible
   * options.
   *
   * @default 'REPEATABLE_READ'
   */
  isolationLevel?: string;

  /**
   * Run built in type validators on insert and update, e.g. validate that arguments passed to integer
   * fields are integer-like.
   *
   * @default false
   */
  typeValidation?: boolean;

  /**
   * The PostgreSQL `standard_conforming_strings` session parameter. Set to `false` to not set the option.
   * WARNING: Setting this to false may expose vulnerabilities and is not recommended!
   *
   * @default true
   */
  standardConformingStrings?: boolean;

  /**
   * Sets global permanent hooks.
   */
  hooks?: Partial<SequelizeHooks>;

  retry?: RetryOptions;
}

export interface QueryOptionsTransactionRequired {}

/**
 * This is the main class, the entry point to sequelize. To use it, you just need to
 * import sequelize:
 *
 * ```js
 * const Sequelize = require('sequelize');
 * ```
 *
 * In addition to sequelize, the connection library for the dialect you want to use
 * should also be installed in your project. You don't need to import it however, as
 * sequelize will take care of that.
 */
export class Sequelize extends SequelizeHooksBase {

  // -------------------- Utilities ------------------------------------------------------------------------

  /**
   * Creates a object representing a database function. This can be used in search queries, both in where and
   * order parts, and as default values in column definitions. If you want to refer to columns in your
   * function, you should use `sequelize.col`, so that the columns are properly interpreted as columns and
   * not a strings.
   *
   * Convert a user's username to upper case
   * ```js
   * instance.update({
   *   username: self.sequelize.fn('upper', self.sequelize.col('username'))
   * })
   * ```
   * @param fn The function you want to call
   * @param args All further arguments will be passed as arguments to the function
   */
  public static fn: typeof fn;

  /**
   * Creates a object representing a column in the DB. This is often useful in conjunction with
   * `sequelize.fn`, since raw string arguments to fn will be escaped.
   *
   * @param col The name of the column
   */
  public static col: typeof col;

  /**
   * Creates a object representing a call to the cast function.
   *
   * @param val The value to cast
   * @param type The type to cast it to
   */
  public static cast: typeof cast;

  /**
   * Creates a object representing a literal, i.e. something that will not be escaped.
   *
   * @param val
   */
  public static literal: typeof literal;

  /**
   * An AND query
   *
   * @param args Each argument will be joined by AND
   */
  public static and: typeof and;

  /**
   * An OR query
   *
   * @param args Each argument will be joined by OR
   */
  public static or: typeof or;

  /**
   * Creates an object representing nested where conditions for postgres's json data-type.
   *
   * @param conditionsOrPath A hash containing strings/numbers or other nested hash, a string using dot
   *   notation or a string using postgres json syntax.
   * @param value An optional value to compare against. Produces a string of the form "<json path> =
   *   '<value>'".
   */
  public static json: typeof json;

  /**
   * A way of specifying attr = condition.
   *
   * The attr can either be an object taken from `Model.rawAttributes` (for example `Model.rawAttributes.id`
   * or
   * `Model.rawAttributes.name`). The attribute should be defined in your model definition. The attribute can
   * also be an object from one of the sequelize utility functions (`sequelize.fn`, `sequelize.col` etc.)
   *
   * For string attributes, use the regular `{ where: { attr: something }}` syntax. If you don't want your
   * string to be escaped, use `sequelize.literal`.
   *
   * @param attr The attribute, which can be either an attribute object from `Model.rawAttributes` or a
   *   sequelize object, for example an instance of `sequelize.fn`. For simple string attributes, use the
   *   POJO syntax
   * @param comparator Comparator
   * @param logic The condition. Can be both a simply type, or a further condition (`.or`, `.and`, `.literal`
   *   etc.)
   */
  public static where: typeof where;

  /**
   * Use CLS with Sequelize.
   * CLS namespace provided is stored as `Sequelize._cls`
   * and bluebird Promise is patched to use the namespace, using `cls-bluebird` module.
   *
   * @param namespace
   */
  public static useCLS(namespace: object): typeof Sequelize;

  /**
   * A reference to Sequelize constructor from sequelize. Useful for accessing DataTypes, Errors etc.
   */
  public Sequelize: typeof Sequelize;

  /**
   * Final config that is used by sequelize.
   */
  public readonly config: Config;

  public readonly modelManager: ModelManager;

  public readonly connectionManager: ConnectionManager;

  /**
   * Dictionary of all models linked with this instance.
   */
  public readonly models: {
    [key: string]: typeof Model;
  };

  /**
   * Instantiate sequelize with name of database, username and password
   *
   * #### Example usage
   *
   * ```javascript
   * // without password and options
   * const sequelize = new Sequelize('database', 'username')
   *
   * // without options
   * const sequelize = new Sequelize('database', 'username', 'password')
   *
   * // without password / with blank password
   * const sequelize = new Sequelize('database', 'username', null, {})
   *
   * // with password and options
   * const sequelize = new Sequelize('my_database', 'john', 'doe', {})
   *
   * // with uri (see below)
   * const sequelize = new Sequelize('mysql://localhost:3306/database', {})
   * ```
   *
   * @param database The name of the database
   * @param username The username which is used to authenticate against the
   *   database.
   * @param password The password which is used to authenticate against the
   *   database.
   * @param options An object with options.
   */
  constructor(database: string, username: string, password?: string, options?: Options);
  constructor(database: string, username: string, options?: Options);
  constructor(options?: Options);

  /**
   * Instantiate sequelize with an URI
   * @param uri A full database URI
   * @param options See above for possible options
   */
  constructor(uri: string, options?: Options);

  /**
   * Returns the specified dialect.
   */
  public getDialect(): string;

  /**
   * Returns an instance of QueryInterface.
   */
  public getQueryInterface(): QueryInterface;

  /**
   * Define a new model, representing a table in the DB.
   *
   * The table columns are defined by the hash that is given as the second argument. Each attribute of the
   * hash
   * represents a column. A short table definition might look like this:
   *
   * ```js
   * class MyModel extends Model {}
   * MyModel.init({
   *   columnA: {
   *     type: Sequelize.BOOLEAN,
   *     validate: {
   *       is: ["[a-z]",'i'],    // will only allow letters
   *       max: 23,          // only allow values <= 23
   *       isIn: {
   *       args: [['en', 'zh']],
   *       msg: "Must be English or Chinese"
   *       }
   *     },
   *     field: 'column_a'
   *     // Other attributes here
   *   },
   *   columnB: Sequelize.STRING,
   *   columnC: 'MY VERY OWN COLUMN TYPE'
   * }, { sequelize })
   *
   * sequelize.models.modelName // The model will now be available in models under the name given to define
   * ```
   *
   * As shown above, column definitions can be either strings, a reference to one of the datatypes that are
   * predefined on the Sequelize constructor, or an object that allows you to specify both the type of the
   * column, and other attributes such as default values, foreign key constraints and custom setters and
   * getters.
   *
   * For a list of possible data types, see
   * http://docs.sequelizejs.com/en/latest/docs/models-definition/#data-types
   *
   * For more about getters and setters, see
   * http://docs.sequelizejs.com/en/latest/docs/models-definition/#getters-setters
   *
   * For more about instance and class methods, see
   * http://docs.sequelizejs.com/en/latest/docs/models-definition/#expansion-of-models
   *
   * For more about validation, see
   * http://docs.sequelizejs.com/en/latest/docs/models-definition/#validations
   *
   * @param modelName  The name of the model. The model will be stored in `sequelize.models` under this name
   * @param attributes An object, where each attribute is a column of the table. Each column can be either a
   *           DataType, a string or a type-description object, with the properties described below:
   * @param options  These options are merged with the default define options provided to the Sequelize
   *           constructor
   */
  public define(modelName: string, attributes: ModelAttributes, options?: ModelOptions): typeof Model;

  /**
   * Fetch a Model which is already defined
   *
   * @param modelName The name of a model defined with Sequelize.define
   */
  public model(modelName: string): typeof Model;

  /**
   * Checks whether a model with the given name is defined
   *
   * @param modelName The name of a model defined with Sequelize.define
   */
  public isDefined(modelName: string): boolean;

  /**
   * Imports a model defined in another file
   *
   * Imported models are cached, so multiple calls to import with the same path will not load the file
   * multiple times
   *
   * See https://github.com/sequelize/sequelize/blob/master/examples/using-multiple-model-files/Task.js for a
   * short example of how to define your models in separate files so that they can be imported by
   * sequelize.import
   *
   * @param path The path to the file that holds the model you want to import. If the part is relative, it
   *   will be resolved relatively to the calling file
   *
   * @param defineFunction An optional function that provides model definitions. Useful if you do not
   *   want to use the module root as the define function
   */
  public import<T extends typeof Model>(
    path: string,
    defineFunction?: (sequelize: Sequelize, dataTypes: typeof DataTypes) => T
  ): T;

  /**
   * Execute a query on the DB, with the posibility to bypass all the sequelize goodness.
   *
   * By default, the function will return two arguments: an array of results, and a metadata object,
   * containing number of affected rows etc. Use `.then(([...]))` to access the results.
   *
   * If you are running a type of query where you don't need the metadata, for example a `SELECT` query, you
   * can pass in a query type to make sequelize format the results:
   *
   * ```js
   * sequelize.query('SELECT...').then(([results, metadata]) {
   *   // Raw query - use spread
   * });
   *
   * sequelize.query('SELECT...', { type: sequelize.QueryTypes.SELECT }).then(results => {
   *   // SELECT query - use then
   * })
   * ```
   *
   * @param sql
   * @param options Query options
   */
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.UPDATE>): Promise<[undefined, number]>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.BULKUPDATE>): Promise<number>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.INSERT>): Promise<[number, number]>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.UPSERT>): Promise<number>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.DELETE>): Promise<void>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.BULKDELETE>): Promise<number>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.SHOWTABLES>): Promise<string[]>;
  public query(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.DESCRIBE>): Promise<{
    [key: string]: {
      type: string;
      allowNull: boolean;
      defaultValue: string;
      primaryKey: boolean;
      autoIncrement: boolean;
      comment: string | null;
    }
  }>;
  public query<M extends Model>(
    sql: string | { query: string; values: unknown[] },
    options: QueryOptionsWithModel
  ): Promise<M[]>;
  public query<T extends object>(sql: string | { query: string; values: unknown[] }, options: QueryOptionsWithType<QueryTypes.SELECT>): Promise<T[]>;
  public query(sql: string | { query: string; values: unknown[] }, options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>): Promise<unknown[]>;

  /**
   * Get the fn for random based on the dialect
   */
  public random(): Fn;

  /**
   * Execute a query which would set an environment or user variable. The variables are set per connection,
   * so this function needs a transaction.
   *
   * Only works for MySQL.
   *
   * @param variables object with multiple variables.
   * @param options Query options.
   */
  public set(variables: object, options: QueryOptionsTransactionRequired): Promise<unknown>;

  /**
   * Escape value.
   *
   * @param value Value that needs to be escaped
   */
  public escape(value: string | number | Date): string;

  /**
   * Create a new database schema.
   *
   * Note,that this is a schema in the
   * [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this command will do nothing.
   *
   * @param schema Name of the schema
   * @param options Options supplied
   */
  public createSchema(schema: string, options: Logging): Promise<unknown>;

  /**
   * Show all defined schemas
   *
   * Note,that this is a schema in the
   * [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this will show all tables.
   *
   * @param options Options supplied
   */
  public showAllSchemas(options: Logging): Promise<object[]>;

  /**
   * Drop a single schema
   *
   * Note,that this is a schema in the
   * [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this drop a table matching the schema name
   *
   * @param schema Name of the schema
   * @param options Options supplied
   */
  public dropSchema(schema: string, options: Logging): Promise<unknown[]>;

  /**
   * Drop all schemas
   *
   * Note,that this is a schema in the
   * [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this is the equivalent of drop all tables.
   *
   * @param options Options supplied
   */
  public dropAllSchemas(options: Logging): Promise<unknown[]>;

  /**
   * Sync all defined models to the DB.
   *
   * @param options Sync Options
   */
  public sync(options?: SyncOptions): Promise<this>;

  /**
   * Truncate all tables defined through the sequelize models. This is done
   * by calling Model.truncate() on each model.
   *
   * @param [options] The options passed to Model.destroy in addition to truncate
   */
  public truncate(options?: DestroyOptions): Promise<unknown[]>;

  /**
   * Drop all tables defined through this sequelize instance. This is done by calling Model.drop on each model
   *
   * @param options The options passed to each call to Model.drop
   */
  public drop(options?: DropOptions): Promise<unknown[]>;

  /**
   * Test the connection by trying to authenticate
   *
   * @param options Query Options for authentication
   */
  public authenticate(options?: QueryOptions): Promise<void>;
  public validate(options?: QueryOptions): Promise<void>;

  /**
   * Start a transaction. When using transactions, you should pass the transaction in the options argument
   * in order for the query to happen under that transaction
   *
   * ```js
   * sequelize.transaction().then(t => {
   *   return User.findOne(..., { transaction: t}).then(user => {
   *   return user.update(..., { transaction: t});
   *   })
   *   .then(t.commit.bind(t))
   *   .catch(t.rollback.bind(t));
   * })
   * ```
   *
   * A syntax for automatically committing or rolling back based on the promise chain resolution is also
   * supported:
   *
   * ```js
   * sequelize.transaction(t => { // Note that we use a callback rather than a promise.then()
   *   return User.findOne(..., { transaction: t}).then(user => {
   *    return user.update(..., { transaction: t});
   *   });
   * }).then(() => {
   *   // Commited
   * }).catch(err => {
   *   // Rolled back
   *   console.error(err);
   * });
   * ```
   *
   * If you have [CLS](https://github.com/othiym23/node-continuation-local-storage) enabled, the transaction
   * will automatically be passed to any query that runs witin the callback. To enable CLS, add it do your
   * project, create a namespace and set it on the sequelize constructor:
   *
   * ```js
   * const cls = require('continuation-local-storage'),
   *   ns = cls.createNamespace('....');
   * const Sequelize = require('sequelize');
   * Sequelize.cls = ns;
   * ```
   * Note, that CLS is enabled for all sequelize instances, and all instances will share the same namespace
   *
   * @param options Transaction Options
   * @param autoCallback Callback for the transaction
   */
  public transaction<T>(options: TransactionOptions, autoCallback: (t: Transaction) => PromiseLike<T>): Promise<T>;
  public transaction<T>(autoCallback: (t: Transaction) => PromiseLike<T>): Promise<T>;
  public transaction(options?: TransactionOptions): Promise<Transaction>;

  /**
   * Close all connections used by this sequelize instance, and free all references so the instance can be
   * garbage collected.
   *
   * Normally this is done on process exit, so you only need to call this method if you are creating multiple
   * instances, and want to garbage collect some of them.
   */
  public close(): Promise<void>;

  /**
   * Returns the database version
   */
  public databaseVersion(): Promise<string>;
}

// Utilities

/**
 * Creates a object representing a database function. This can be used in search queries, both in where and
 * order parts, and as default values in column definitions. If you want to refer to columns in your
 * function, you should use `sequelize.col`, so that the columns are properly interpreted as columns and
 * not a strings.
 *
 * Convert a user's username to upper case
 * ```js
 * instance.update({
 *   username: self.sequelize.fn('upper', self.sequelize.col('username'))
 * })
 * ```
 * @param fn The function you want to call
 * @param args All further arguments will be passed as arguments to the function
 */
export function fn(fn: string, ...args: unknown[]): Fn;

/**
 * Creates a object representing a column in the DB. This is often useful in conjunction with
 * `sequelize.fn`, since raw string arguments to fn will be escaped.
 *
 * @param col The name of the column
 */
export function col(col: string): Col;

/**
 * Creates a object representing a call to the cast function.
 *
 * @param val The value to cast
 * @param type The type to cast it to
 */
export function cast(val: unknown, type: string): Cast;

/**
 * Creates a object representing a literal, i.e. something that will not be escaped.
 *
 * @param val
 */
export function literal(val: string): Literal;

/**
 * An AND query
 *
 * @param args Each argument will be joined by AND
 */
export function and(...args: (WhereOperators | WhereAttributeHash | Where)[]): AndOperator;

/**
 * An OR query
 *
 * @param args Each argument will be joined by OR
 */
export function or(...args: (WhereOperators | WhereAttributeHash | Where)[]): OrOperator;

/**
 * Creates an object representing nested where conditions for postgres's json data-type.
 *
 * @param conditionsOrPath A hash containing strings/numbers or other nested hash, a string using dot
 *   notation or a string using postgres json syntax.
 * @param value An optional value to compare against. Produces a string of the form "<json path> =
 *   '<value>'".
 */
export function json(conditionsOrPath: string | object, value?: string | number | boolean): Json;

export type AttributeType = Fn | Col | Literal | ModelAttributeColumnOptions | string;
export type LogicType = Fn | Col | Literal | OrOperator | AndOperator | WhereOperators | string;

/**
 * A way of specifying attr = condition.
 *
 * The attr can either be an object taken from `Model.rawAttributes` (for example `Model.rawAttributes.id`
 * or
 * `Model.rawAttributes.name`). The attribute should be defined in your model definition. The attribute can
 * also be an object from one of the sequelize utility functions (`sequelize.fn`, `sequelize.col` etc.)
 *
 * For string attributes, use the regular `{ where: { attr: something }}` syntax. If you don't want your
 * string to be escaped, use `sequelize.literal`.
 *
 * @param attr The attribute, which can be either an attribute object from `Model.rawAttributes` or a
 *   sequelize object, for example an instance of `sequelize.fn`. For simple string attributes, use the
 *   POJO syntax
 * @param comparator Comparator
 * @param logic The condition. Can be both a simply type, or a further condition (`.or`, `.and`, `.literal`
 *   etc.)
 */
export function where(attr: AttributeType, comparator: string, logic: LogicType): Where;
export function where(attr: AttributeType, logic: LogicType): Where;

export default Sequelize;
